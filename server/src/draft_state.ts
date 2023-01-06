import { join_session, LoggedInAuthUser } from './auth'
import { allRegions, Card, Region } from 'card'
import { POOL_SIZE } from 'draft'
import {
  allFullfilled,
  ErrStatusT,
  isOk,
  MakeErrStatus,
  narrowType,
  OkStatus,
  randChoice,
  randSample,
  rejectedResultReasons,
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

export interface ServerDraftStateInfo extends DraftStateInfo {
  draft_state: StateMachine<typeof draft_states_def, DraftStates>
}

interface InDraftSessionInfo extends SessionInfo {
  draft_state_info: ServerDraftStateInfo
}

const enum DraftStates {
  INIT = 'INIT',
  INITIAL_SELECTION = 'INITIAL_SELECTION',
  RANDOM_SELECTION_1 = 'RANDOM_SELECTION_1',
  CHAMP_ROUND_1 = 'CHAMP_ROUND_1',
  RANDOM_SELECTION_2 = 'RANDOM_SELECTION_2',
  CHAMP_ROUND_2 = 'CHAMP_ROUND_2',
  RANDOM_SELECTION_3 = 'RANDOM_SELECTION_3',
  CHAMP_ROUND_3 = 'CHAMP_ROUND_3',
  TRIM_DECK = 'TRIM_DECK',
  GENERATE_CODE = 'GENERATE_CODE',
}

const draft_states_def = {
  [DraftStates.INIT]: {
    [DraftStates.INITIAL_SELECTION]: (
      draft_state_info: ServerDraftStateInfo,
      callback: (status: Status, champ_cards: Card[] | null) => void
    ) => {
      const regions = randSample(draft_state_info.deck.regions, POOL_SIZE)

      Promise.allSettled(
        regions.map(
          (region) =>
            new Promise(
              (
                resolve: (card: Card) => void,
                reject: (status: Status) => void
              ) => {
                randomChampCards(region, 1, (status, card) => {
                  if (!isOk(status) || card === null) {
                    // error!
                    reject(status)
                    return
                  }
                  resolve(card[0])
                })
              }
            )
        )
      ).then((statuses) => {
        if (!allFullfilled(statuses)) {
          draft_state_info.draft_state.undo_transition(
            DraftStates.INITIAL_SELECTION,
            DraftStates.INIT
          )
          const err_statuses: ErrStatusT[] = rejectedResultReasons(statuses)
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

        const cards = statuses.map((status) => status.value)
        draft_state_info.pending_cards = cards

        callback(OkStatus, cards)
        return
      })
    },
  },
  [DraftStates.INITIAL_SELECTION]: {
    // [DraftStates.RANDOM_SELECTION_1]: (draft: DraftDeck) => {
    //   return
    // },
    [DraftStates.GENERATE_CODE]: (draft: DraftDeck) => {
      console.log(draft)
    },
  },
  [DraftStates.RANDOM_SELECTION_1]: {
    // [DraftStates.CHAMP_ROUND_1]: (draft: DraftDeck) => {
    //   return
    // },
    // [DraftStates.RANDOM_SELECTION_1]: (draft: DraftDeck) => {
    //   return
    // },
  },
  [DraftStates.CHAMP_ROUND_1]: {
    // [DraftStates.RANDOM_SELECTION_2]: (draft: DraftDeck) => {
    //   return
    // },
  },
  [DraftStates.RANDOM_SELECTION_2]: {
    // [DraftStates.CHAMP_ROUND_2]: (draft: DraftDeck) => {
    //   return
    // },
    // [DraftStates.RANDOM_SELECTION_2]: (draft: DraftDeck) => {
    //   return
    // },
  },
  [DraftStates.CHAMP_ROUND_2]: {
    // [DraftStates.RANDOM_SELECTION_3]: (draft: DraftDeck) => {
    //   return
    // },
  },
  [DraftStates.RANDOM_SELECTION_3]: {
    // [DraftStates.CHAMP_ROUND_3]: (draft: DraftDeck) => {
    //   return
    // },
    // [DraftStates.RANDOM_SELECTION_3]: (draft: DraftDeck) => {
    //   return
    // },
  },
  [DraftStates.CHAMP_ROUND_3]: {
    // [DraftStates.TRIM_DECK]: (draft: DraftDeck) => {
    //   return
    // },
  },
  [DraftStates.TRIM_DECK]: {
    // [DraftStates.GENERATE_CODE]: (draft: DraftDeck) => {
    //   return
    // },
  },
  [DraftStates.GENERATE_CODE]: {},
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

  socket.respond('initial_selection', (resolve, session_cred) => {
    join_session(session_cred, (status, auth_user) => {
      if (!isOk(status) || auth_user === undefined) {
        resolve(status, null)
        return
      }

      const [draft_info_status, draft_info] = draftStateInfo(auth_user)
      if (!isOk(draft_info_status) || draft_info === null) {
        resolve(draft_info_status, null)
        return
      }

      const state = draft_info.draft_state
      const trans_status = state.transition(
        DraftStates.INIT,
        DraftStates.INITIAL_SELECTION,
        draft_info,
        (status, champ_cards) => {
          if (!isOk(status) || champ_cards === null) {
            resolve(status, null)
            return
          }

          resolve(status, champ_cards)
        }
      )

      if (!isOk(trans_status)) {
        resolve(trans_status, null)
        return
      }
    })
  })
}

function randomChampCards(
  region: Region,
  num_champs: number,
  callback: (status: Status, cards: Card[] | null) => void
): void {
  regionSets((status, region_sets) => {
    if (!isOk(status) || region_sets === null) {
      callback(status, null)
      return
    }
    callback(OkStatus, randSample(region_sets[region].champs, num_champs))
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
    DraftStates.INIT as DraftStates
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
