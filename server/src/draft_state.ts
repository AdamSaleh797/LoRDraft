import { join_session, LoggedInAuthUser } from './auth'
import { Card, CardT, isOrigin, regionContains } from 'card'
import {
  addCardToDeck,
  canAddToDeck,
  DraftDeck,
  DraftState,
  draftStateCardLimits,
  DraftStateInfo,
  DraftStateInfoT,
  makeDraftDeck,
  POOL_SIZE,
} from 'draft'
import {
  AddSubStatuses,
  binarySearch,
  containsDuplicates,
  containsNoNull,
  ErrStatusT,
  isOk,
  MakeErrStatus,
  narrowType,
  OkStatus,
  randChoice,
  randSampleNumbers,
  Status,
  StatusCode,
} from 'lor_util'
import { SessionInfo } from './session'
import { regionSets } from './set_packs'
import { LoRDraftSocket } from 'socket-msgs'
import { StateMachine } from 'state_machine'
import { Array } from 'runtypes'

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
    draft_state_info.deck,
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
            'Failed to retrieve cards',
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
  draft_state_info: ServerDraftStateInfo,
  prev_state: DraftState,
  callback: (status: Status, cards: Card[] | null) => void
) {
  randomNonChampCards(draft_state_info.deck, POOL_SIZE, (status, cards) => {
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
          'Failed to retrieve cards',
          err_statuses
        ),
        null
      )
      return
    }

    draft_state_info.pending_cards = cards

    callback(OkStatus, cards)
  })
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
      if (draft_state_info.deck.numCards < RANDOM_SELECTION_1_CARD_CUTOFF) {
        return DraftState.RANDOM_SELECTION_1
      } else {
        return DraftState.CHAMP_ROUND_1
      }
    case DraftState.CHAMP_ROUND_1:
      return DraftState.RANDOM_SELECTION_2
    case DraftState.RANDOM_SELECTION_2:
      if (draft_state_info.deck.numCards < RANDOM_SELECTION_2_CARD_CUTOFF) {
        return DraftState.RANDOM_SELECTION_2
      } else {
        return DraftState.CHAMP_ROUND_2
      }
    case DraftState.CHAMP_ROUND_2:
      return DraftState.RANDOM_SELECTION_3
    case DraftState.RANDOM_SELECTION_3:
      if (draft_state_info.deck.numCards < RANDOM_SELECTION_3_CARD_CUTOFF) {
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

  socket.respond('choose_cards', (resolve, session_cred, cards) => {
    const CardListT = Array(CardT).asReadonly()

    if (!CardListT.guard(cards)) {
      resolve(
        MakeErrStatus(
          StatusCode.INCORRECT_MESSAGE_ARGUMENTS,
          `Argument \`cards\` to 'choose_cards' is not of the correct type.`
        )
      )
      return
    }

    join_session(session_cred, (status, auth_user) => {
      if (!isOk(status) || auth_user === undefined) {
        resolve(status)
        return
      }

      const [draft_info_status, draft_info] = draftStateInfo(auth_user)
      if (!isOk(draft_info_status) || draft_info === null) {
        resolve(draft_info_status)
        return
      }

      if (draft_info.pending_cards.length === 0) {
        resolve(
          MakeErrStatus(
            StatusCode.NOT_WAITING_FOR_CARD_SELECTION,
            'Draft state is not currently waiting for pending cards from the client.'
          )
        )
        return
      }

      const min_max_cards = draftStateCardLimits(draft_info.draft_state.state())
      if (min_max_cards === null) {
        resolve(
          MakeErrStatus(
            StatusCode.NOT_WAITING_FOR_CARD_SELECTION,
            'Draft state is not currently waiting for pending cards from the client.'
          )
        )
        return
      }
      const [min_cards, max_cards] = min_max_cards

      if (cards.length < min_cards || cards.length > max_cards) {
        resolve(
          MakeErrStatus(
            StatusCode.INCORRECT_NUM_CHOSEN_CARDS,
            `Cannot choose ${
              cards.length
            } cards in state ${draft_info.draft_state.state()}, must choose from ${min_cards} to ${max_cards} cards`
          )
        )
      }

      const pending_cards = draft_info.pending_cards
      const chosen_cards = cards.map((card) => {
        return (
          pending_cards.find(
            (pending_card) => pending_card.cardCode === card.cardCode
          ) ?? null
        )
      })

      if (!containsNoNull(chosen_cards)) {
        resolve(
          MakeErrStatus(
            StatusCode.NOT_PENDING_CARD,
            `Some chosen cards are not pending cards`
          )
        )
        return
      }

      // Add the chosen cards to the deck.
      chosen_cards.forEach((card) => {
        addCardToDeck(draft_info.deck, card)
      })
      draft_info.pending_cards = []

      // After initial selection, filter out all origins from the candidate
      // regions that aren't covered by the two chosen champions.
      if (draft_info.draft_state.state() === DraftState.INITIAL_SELECTION) {
        draft_info.deck.regions = draft_info.deck.regions.filter((region) => {
          return (
            !isOrigin(region) ||
            chosen_cards.some((card) => regionContains(region, card))
          )
        })
      }

      resolve(OkStatus)
    })
  })
}

function randomChampCards(
  deck: DraftDeck,
  num_champs: number,
  allow_same_region: boolean,
  callback: (status: Status, cards: Card[] | null) => void
): void {
  regionSets((status, region_sets) => {
    if (!isOk(status) || region_sets === null) {
      callback(status, null)
      return
    }

    const region_pool = deck.regions
    const [region_count, cumulative_totals] = region_pool.reduce<
      [number, number[]]
    >(
      ([region_count, cumulative_totals], region) => {
        const num_champs = region_sets[region].champs.length
        return [
          region_count + num_champs,
          cumulative_totals.concat([region_count]),
        ]
      },
      [0, []]
    )

    // List of pairs of [region_idx, set_idx], where region_idx is the index of
    // the region of the champ card chosen, and set_idx is the index of the
    // champ card within that region.
    let region_and_set_indexes: [number, number][]
    let champs: Card[]
    do {
      region_and_set_indexes = randSampleNumbers(region_count, num_champs).map(
        (index) => {
          const region_idx = binarySearch(cumulative_totals, index)
          return [region_idx, index - cumulative_totals[region_idx]]
        }
      )
      champs = region_and_set_indexes.map(([region_idx, idx]) => {
        return region_sets[region_pool[region_idx]].champs[idx]
      })
    } while (
      allow_same_region ||
      containsDuplicates(
        region_and_set_indexes,
        (region_and_set_idx) => region_and_set_idx[0]
      ) ||
      containsDuplicates(
        champs.map((champ) => {
          return champ.cardCode
        })
      ) ||
      champs.some((champ) => {
        return !canAddToDeck(deck, champ)
      })
    )

    callback(OkStatus, champs)
  })
}

function randomNonChampCards(
  deck: DraftDeck,
  num_champs: number,
  callback: (status: Status, cards: Card[] | null) => void
): void {
  regionSets((status, region_sets) => {
    if (!isOk(status) || region_sets === null) {
      callback(status, null)
      return
    }

    const cards: Card[] = []
    const region_pool = deck.regions
    let iterations = 0

    do {
      iterations++

      const region = randChoice(region_pool)
      const card = randChoice(region_sets[region].nonChamps)

      if (cards.includes(card) && iterations < MAX_CARD_REPICK_ITERATIONS) {
        continue
      }

      // Find all regions this card matches from the region_pool.
      const regions = region_pool.filter((region) =>
        regionContains(region, card)
      )

      if (regions.length > 1) {
        // For multi-region cards, only take it with 1/num_regions probability.
        /*
        if (Math.random() * regions.length >= 1) {
          continue
        }
        */

        // TODO: check how this distribution compares to a weighted average
        // over 1/region_size, i.e. take the card with 1/region_size / (sum over 1/region_size from region_pool)
        const region_size = region_sets[region].nonChamps.length
        const weighted_sizes = regions.reduce<number>(
          (_1, region) => 1 / region_sets[region].nonChamps.length,
          0
        )
        if (Math.random() * region_size * weighted_sizes > 1) {
          continue
        }
      }

      // Despite a card being in one of the potential regions of the deck, it is
      // possible for it to be incompatible, so we have to verify that the card
      // can be added to the deck with a full compatibility check.
      if (!canAddToDeck(deck, card)) {
        continue
      }

      cards.push(card)
    } while (cards.length < num_champs)

    callback(OkStatus, cards)
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
    deck: makeDraftDeck(),
    pending_cards: [],
  }
  return OkStatus
}

function inDraft(
  session_info: SessionInfo
): session_info is InDraftSessionInfo {
  return session_info.draft_state_info !== undefined
}
