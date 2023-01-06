import { join_session, LoggedInAuthUser } from './auth'
import { allRegions, Card, Region, regionContains } from 'card'
import { DraftState, POOL_SIZE } from 'draft'
import {
  AddSubStatuses,
  ErrStatusT,
  isOk,
  MakeErrStatus,
  narrowType,
  OkStatus,
  randChoice,
  Status,
  StatusCode,
} from 'lor_util'
import { SessionInfo } from './session'
import { regionSets } from './set_packs'
import {
  DraftDeck,
  DraftStateInfo,
  DraftStateInfoT,
  LoRDraftSocket,
} from 'socket-msgs'
import { StateMachine } from 'state_machine'

const MAX_CARD_REPICK_ITERATIONS = 100

const RANDOM_SELECTION_1_CARD_CUTOFF = 20
const RANDOM_SELECTION_2_CARD_CUTOFF = 37
const RANDOM_SELECTION_3_CARD_CUTOFF = 43

export interface ServerDraftStateInfo extends DraftStateInfo {
  draft_state: StateMachine<typeof draft_states_def, DraftState>
}

interface InDraftSessionInfo extends SessionInfo {
  draft_state_info: ServerDraftStateInfo
}

function choose_champ_cards(
  draft_state_info: ServerDraftStateInfo,
  prev_state: DraftState,
  callback: (status: Status, champ_cards: Card[] | null) => void,
  allow_same_region = true
) {
  randomChampCards(
    draft_state_info.deck.regions,
    POOL_SIZE,
    allow_same_region,
    (status, cards) => {
      if (!isOk(status) || cards === null) {
        const undo_status = draft_state_info.draft_state.undo_transition_any(
          draft_state_info.draft_state.state(),
          prev_state
        )

        let err_statuses = [status as ErrStatusT]
        if (!isOk(undo_status)) {
          err_statuses = [AddSubStatuses(undo_status, err_statuses)]
        }

        callback(
          MakeErrStatus(
            StatusCode.RETRIEVE_CARD_ERROR,
            'Failed to retrieve card',
            err_statuses
          ),
          null
        )
        return
      }

      draft_state_info.pending_cards = cards

      callback(OkStatus, cards)
    }
  )
}

function choose_non_champ_cards(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  draft_state_info: ServerDraftStateInfo,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prev_state: DraftState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  callback: (status: Status, cards: Card[] | null) => void
) {
  return
}

const draft_states_def = {
  [DraftState.INIT]: {
    [DraftState.INITIAL_SELECTION]: (
      draft_state_info: ServerDraftStateInfo,
      prev_state: DraftState,
      callback: (status: Status, champ_cards: Card[] | null) => void
    ) => {
      choose_champ_cards(draft_state_info, prev_state, callback, false)
    },
  },
  [DraftState.INITIAL_SELECTION]: {
    [DraftState.RANDOM_SELECTION_1]: choose_non_champ_cards,
  },
  [DraftState.RANDOM_SELECTION_1]: {
    [DraftState.CHAMP_ROUND_1]: choose_champ_cards,
    [DraftState.RANDOM_SELECTION_1]: choose_non_champ_cards,
  },
  [DraftState.CHAMP_ROUND_1]: {
    [DraftState.RANDOM_SELECTION_2]: choose_non_champ_cards,
  },
  [DraftState.RANDOM_SELECTION_2]: {
    [DraftState.CHAMP_ROUND_2]: choose_champ_cards,
    [DraftState.RANDOM_SELECTION_2]: choose_non_champ_cards,
  },
  [DraftState.CHAMP_ROUND_2]: {
    [DraftState.RANDOM_SELECTION_3]: choose_non_champ_cards,
  },
  [DraftState.RANDOM_SELECTION_3]: {
    [DraftState.CHAMP_ROUND_3]: choose_champ_cards,
    [DraftState.RANDOM_SELECTION_3]: choose_non_champ_cards,
  },
  [DraftState.CHAMP_ROUND_3]: {
    // [DraftState.TRIM_DECK]: (draft: DraftDeck) => {
    //   return
    // },
  },
  [DraftState.TRIM_DECK]: {
    // [DraftState.GENERATE_CODE]: (draft: DraftDeck) => {
    //   return
    // },
  },
  [DraftState.GENERATE_CODE]: {},
} as const

function draftStateInfo(
  auth_user: LoggedInAuthUser
): [Status, ServerDraftStateInfo | null] {
  if (!inDraft(auth_user.session_info)) {
    return [
      MakeErrStatus(StatusCode.NOT_IN_DRAFT_SESSION, 'No draft session found.'),
      null,
    ]
  } else {
    return [OkStatus, auth_user.session_info.draft_state_info]
  }
}

/**
 * @param draft_state_info Current draft state info of the draft.
 * @returns The next state of the draft.
 */
function nextDraftState(
  state: DraftState,
  draft_state_info: ServerDraftStateInfo
): DraftState | null {
  switch (state) {
    case DraftState.INIT:
      return DraftState.INITIAL_SELECTION
    case DraftState.INITIAL_SELECTION:
      return DraftState.RANDOM_SELECTION_1
    case DraftState.RANDOM_SELECTION_1:
      if (draft_state_info.deck.cards.length < RANDOM_SELECTION_1_CARD_CUTOFF) {
        return DraftState.RANDOM_SELECTION_1
      } else {
        return DraftState.CHAMP_ROUND_1
      }
    case DraftState.CHAMP_ROUND_1:
      return DraftState.RANDOM_SELECTION_2
    case DraftState.RANDOM_SELECTION_2:
      if (draft_state_info.deck.cards.length < RANDOM_SELECTION_2_CARD_CUTOFF) {
        return DraftState.RANDOM_SELECTION_2
      } else {
        return DraftState.CHAMP_ROUND_2
      }
    case DraftState.CHAMP_ROUND_2:
      return DraftState.RANDOM_SELECTION_3
    case DraftState.RANDOM_SELECTION_3:
      if (draft_state_info.deck.cards.length < RANDOM_SELECTION_3_CARD_CUTOFF) {
        return DraftState.RANDOM_SELECTION_3
      } else {
        return DraftState.CHAMP_ROUND_3
      }
    case DraftState.CHAMP_ROUND_3:
      return DraftState.TRIM_DECK
    case DraftState.TRIM_DECK:
      return DraftState.GENERATE_CODE
    case DraftState.GENERATE_CODE:
      return null
  }
}

export function initDraftState(socket: LoRDraftSocket) {
  socket.respond('current_draft', (resolve, session_cred) => {
    join_session(session_cred, (status, auth_user) => {
      if (!isOk(status) || auth_user === undefined) {
        resolve(status, null)
        return
      }

      const [draft_status, draft_state_info] = draftStateInfo(auth_user)
      if (!isOk(draft_status) || draft_state_info === null) {
        resolve(draft_status, null)
        return
      }

      const draft_info = narrowType(
        DraftStateInfoT,
        draft_state_info
      ) as DraftStateInfo | null
      if (draft_info === null) {
        resolve(
          MakeErrStatus(
            StatusCode.INTERNAL_SERVER_ERROR,
            'Failed narrow draft info from ServerDraftInfo'
          ),
          null
        )
        return
      }

      resolve(draft_status, draft_info)
    })
  })

  socket.respond('join_draft', (resolve, session_cred) => {
    join_session(session_cred, (status, auth_user) => {
      if (!isOk(status) || auth_user === undefined) {
        resolve(status)
        return
      }

      resolve(enterDraft(auth_user.session_info))
    })
  })

  socket.respond('next_pool', (resolve, session_cred) => {
    join_session(session_cred, (status, auth_user) => {
      if (!isOk(status) || auth_user === undefined) {
        resolve(status, null, null)
        return
      }

      const [draft_info_status, draft_info] = draftStateInfo(auth_user)
      if (!isOk(draft_info_status) || draft_info === null) {
        resolve(draft_info_status, null, null)
        return
      }

      const state = draft_info.draft_state

      // If there are still pending cards, then one hasn't been chosen yet.
      // Re-return the current card pool.
      if (draft_info.pending_cards.length !== 0) {
        resolve(OkStatus, draft_info.pending_cards, state.state())
        return
      }

      const cur_state = state.state()
      const next_draft_state = nextDraftState(cur_state, draft_info)

      if (next_draft_state === null) {
        resolve(
          MakeErrStatus(
            StatusCode.DRAFT_COMPLETE,
            'The draft is complete, no more pools to choose from.'
          ),
          null,
          null
        )
        return
      }

      const trans_status = state.transition_any(
        cur_state,
        next_draft_state,
        draft_info,
        cur_state,
        (status: Status, cards: Card[]) => {
          if (!isOk(status) || cards === null) {
            resolve(status, null, null)
            return
          }

          resolve(status, cards, next_draft_state)
        }
      )

      if (!isOk(trans_status)) {
        resolve(trans_status, null, null)
        return
      }
    })
  })
}

function randomChampCards(
  region_pool: Region[],
  num_champs: number,
  allow_same_region: boolean,
  callback: (status: Status, cards: Card[] | null) => void
): void {
  regionSets((status, region_sets) => {
    if (!isOk(status) || region_sets === null) {
      callback(status, null)
      return
    }

    const cards: Card[] = []
    let iterations = 0

    do {
      iterations++

      const region = randChoice(region_pool)
      const card = randChoice(region_sets[region].champs)

      if (cards.includes(card) && iterations < MAX_CARD_REPICK_ITERATIONS) {
        continue
      }

      // Find all regions this card matches from the region_pool.
      const regions = region_pool.filter((region) =>
        regionContains(region, card)
      )

      console.log(card)
      console.log(region_pool)
      console.log(regions)

      if (regions.length > 1) {
        // For multi-region cards, only take it with 1/num_regions probability.
        if (Math.random() * regions.length >= 1) {
          continue
        }

        // TODO: check how this distribution compares to a weighted average
        // over 1/region_size, i.e. take the card with 1/region_size / (sum over 1/region_size from region_pool)
        /*
        const region_size = region_sets[region].champs.length
        const weighted_sizes = regions.reduce<number>(
          (total, region) => 1 / region_sets[region].champs.length,
          0
        )
        if (Math.random() * region_size * weighted_sizes > 1) {
          continue
        }
        */
      }

      cards.push(card)
      if (!allow_same_region) {
        // If allow_same_region is not set, filter out all regions that match
        // this card.
        region_pool = region_pool.filter((region) => !regions.includes(region))
      }
    } while (cards.length < num_champs)

    callback(OkStatus, cards)
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function randomNonChampCards(
  deck: DraftDeck,
  callback: (status: Status, card: Card | null) => void
): void {
  const region = randChoice(deck.regions)
  regionSets((status, region_sets) => {
    if (!isOk(status) || region_sets === null) {
      callback(status, null)
      return
    }
    callback(OkStatus, randChoice(region_sets[region].nonChamps))
  })
}

export function enterDraft(session_info: SessionInfo): Status {
  if (inDraft(session_info)) {
    return MakeErrStatus(
      StatusCode.ALREADY_IN_DRAFT_SESSION,
      'Already in draft session siwwy'
    )
  }
  const draft_state = new StateMachine(
    draft_states_def,
    DraftState.INIT as DraftState
  )

  session_info.draft_state_info = {
    draft_state: draft_state,
    deck: {
      regions: allRegions().slice(),
      cards: [],
    },
    pending_cards: [],
  }
  return OkStatus
}

function inDraft(
  session_info: SessionInfo
): session_info is InDraftSessionInfo {
  return session_info.draft_state_info !== undefined
}
