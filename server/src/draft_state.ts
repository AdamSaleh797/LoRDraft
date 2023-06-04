import { join_session, LoggedInAuthUser } from './auth'
import {
  Card,
  CardT,
  isChampion,
  isOrigin,
  MAX_CARD_COPIES,
  regionContains,
} from 'card'
import {
  addCardsToDeck,
  canAddToDeck,
  DraftDeck,
  DraftState,
  draftStateCardLimits,
  makeDraftDeck,
  POOL_SIZE,
} from 'draft'
import {
  binarySearch,
  containsDuplicates,
  isOk,
  makeErrStatus,
  OkStatus,
  randChoice,
  Status,
  StatusCode,
  intersectListsPred,
  randSample,
  randSampleNumbersAvoidingRepeats,
} from 'lor_util'
import { SessionInfo } from './session'
import { regionSets } from './set_packs'
import { LoRDraftSocket } from 'socket-msgs'
import { Array as ArrayT } from 'runtypes'
import { DraftOptions, DraftOptionsT } from 'draft_options'

const GUARANTEED_CHAMP_COUNT = 2
const RESTRICTED_POOL_DRAFT_STATES = [
  DraftState.CHAMP_ROUND_1,
  DraftState.CHAMP_ROUND_2,
  // DraftState.CHAMP_ROUND_3,
]

const MAX_CARD_REPICK_ITERATIONS = 100

const RANDOM_SELECTION_1_CARD_CUTOFF = 20
const RANDOM_SELECTION_2_CARD_CUTOFF = 37
//FIXME: REVERT THIS BACK TO 43
const RANDOM_SELECTION_3_CARD_CUTOFF = 46

// export type ServerDraftState = StateMachine<typeof draft_states_def, DraftState>
export interface ServerDraftState {
  state: DraftState
  deck: DraftDeck
  pending_cards: Card[]
}

interface InDraftSessionInfo extends SessionInfo {
  draft_state: ServerDraftState
}

function choose_champ_cards(
  draft_state: DraftState,
  deck: DraftDeck,
  callback: (status: Status, champ_cards: Card[] | null) => void,
  allow_same_region = true
) {
  const num_guaranteed_champs = RESTRICTED_POOL_DRAFT_STATES.includes(
    draft_state
  )
    ? GUARANTEED_CHAMP_COUNT
    : 0

  randomChampCardsFromDeck(
    deck,
    num_guaranteed_champs,
    (status, guaranteed_cards) => {
      if (!isOk(status) || guaranteed_cards === null) {
        callback(status, null)
        return
      }

      randomChampCards(
        deck,
        POOL_SIZE - guaranteed_cards.length,
        allow_same_region,
        guaranteed_cards,
        (status, cards) => {
          if (!isOk(status) || cards === null) {
            callback(status, null)
            return
          }

          cards = guaranteed_cards.concat(cards)
          callback(OkStatus, cards)
        }
      )
    }
  )
}

function choose_non_champ_cards(
  deck: DraftDeck,
  callback: (status: Status, cards: Card[] | null) => void
) {
  randomNonChampCards(deck, POOL_SIZE, (status, cards) => {
    if (!isOk(status) || cards === null) {
      callback(status, null)
      return
    }

    callback(OkStatus, cards)
  })
}

function draftState(
  auth_user: LoggedInAuthUser
): [Status, ServerDraftState | null] {
  if (!inDraft(auth_user.session_info)) {
    return [
      makeErrStatus(StatusCode.NOT_IN_DRAFT_SESSION, 'No draft session found.'),
      null,
    ]
  } else {
    return [OkStatus, auth_user.session_info.draft_state]
  }
}

/**
 * Returns the next draft state, depending on the current state and the size of
 * the deck.
 */
function nextDraftState(state: DraftState, deck: DraftDeck): DraftState | null {
  switch (state) {
    case DraftState.INIT:
      return DraftState.INITIAL_SELECTION
    case DraftState.INITIAL_SELECTION:
      return DraftState.RANDOM_SELECTION_1
    case DraftState.RANDOM_SELECTION_1:
      if (deck.numCards < RANDOM_SELECTION_1_CARD_CUTOFF) {
        return DraftState.RANDOM_SELECTION_1
      } else {
        return DraftState.CHAMP_ROUND_1
      }
    case DraftState.CHAMP_ROUND_1:
      return DraftState.RANDOM_SELECTION_2
    case DraftState.RANDOM_SELECTION_2:
      if (deck.numCards < RANDOM_SELECTION_2_CARD_CUTOFF) {
        return DraftState.RANDOM_SELECTION_2
      } else {
        return DraftState.CHAMP_ROUND_2
      }
    case DraftState.CHAMP_ROUND_2:
      return DraftState.RANDOM_SELECTION_3
    case DraftState.RANDOM_SELECTION_3:
      if (deck.numCards < RANDOM_SELECTION_3_CARD_CUTOFF) {
        return DraftState.RANDOM_SELECTION_3
      } else {
        return DraftState.GENERATE_CODE
        // TODO revert this
        // return DraftState.CHAMP_ROUND_3
      }
    // case DraftState.CHAMP_ROUND_3:
    //   return DraftState.TRIM_DECK
    // case DraftState.TRIM_DECK:
    //   return DraftState.GENERATE_CODE
    case DraftState.GENERATE_CODE:
      return null
  }
}

function choose_next_cards(
  draft_state: DraftState,
  draft_deck: DraftDeck,
  callback: (status: Status, champ_cards: Card[] | null) => void
) {
  switch (draft_state) {
    case DraftState.INIT: {
      callback(
        makeErrStatus(
          StatusCode.INTERNAL_SERVER_ERROR,
          'Should not have called `choose_next_cards` on a newly initialized draft before generating the pending pool.'
        ),
        null
      )
      break
    }
    case DraftState.INITIAL_SELECTION: {
      choose_champ_cards(draft_state, draft_deck, callback, false)
      break
    }
    case DraftState.CHAMP_ROUND_1:
    case DraftState.CHAMP_ROUND_2: {
      choose_champ_cards(draft_state, draft_deck, callback)
      break
    }
    case DraftState.RANDOM_SELECTION_1:
    case DraftState.RANDOM_SELECTION_2:
    case DraftState.RANDOM_SELECTION_3: {
      choose_non_champ_cards(draft_deck, callback)
      break
    }
    case DraftState.GENERATE_CODE: {
      callback(
        makeErrStatus(
          StatusCode.DRAFT_COMPLETE,
          'The draft is complete, no more card selections to be made.'
        ),
        null
      )
      break
    }
  }
}

export function initDraftState(socket: LoRDraftSocket) {
  socket.respond('current_draft', (resolve, session_cred) => {
    join_session(session_cred, (status, auth_user) => {
      if (!isOk(status) || auth_user === undefined) {
        resolve(status, null)
        return
      }

      const [draft_status, draft_state] = draftState(auth_user)
      if (!isOk(draft_status) || draft_state === null) {
        resolve(draft_status, null)
        return
      }

      const draft_info = {
        state: draft_state.state,
        deck: draft_state.deck,
        pending_cards: [],
      }
      resolve(draft_status, draft_info)
    })
  })

  socket.respond('join_draft', (resolve, session_cred, draft_options) => {
    if (!DraftOptionsT.guard(draft_options)) {
      resolve(
        makeErrStatus(
          StatusCode.INCORRECT_MESSAGE_ARGUMENTS,
          `Argument \`draft_options\` to 'join_draft' is not of the correct type.`
        )
      )
      return
    }

    join_session(session_cred, (status, auth_user) => {
      if (!isOk(status) || auth_user === undefined) {
        resolve(status)
        return
      }

      enterDraft(auth_user.session_info, draft_options, resolve)
    })
  })

  socket.respond('close_draft', (resolve, session_cred) => {
    join_session(session_cred, (status, auth_user) => {
      if (!isOk(status) || auth_user === undefined) {
        resolve(status)
        return
      }

      resolve(exitDraft(auth_user.session_info))
    })
  })

  socket.respond('next_pool', (resolve, session_cred) => {
    join_session(session_cred, (status, auth_user) => {
      if (!isOk(status) || auth_user === undefined) {
        resolve(status, null, null)
        return
      }

      const [draft_info_status, draft_state] = draftState(auth_user)
      if (!isOk(draft_info_status) || draft_state === null) {
        resolve(draft_info_status, null, null)
        return
      }

      // If there are still pending cards, then one hasn't been chosen yet.
      // Re-return the current card pool.
      if (draft_state.pending_cards.length !== 0) {
        resolve(OkStatus, draft_state.pending_cards, draft_state.state)
        return
      }

      const cur_state = draft_state.state
      const next_draft_state = nextDraftState(cur_state, draft_state.deck)
      //TODO: Check if in right state
      if (next_draft_state === null) {
        resolve(
          makeErrStatus(
            StatusCode.DRAFT_COMPLETE,
            'The draft is complete, no more pools to choose from.'
          ),
          null,
          null
        )
        return
      }

      choose_next_cards(next_draft_state, draft_state.deck, (status, cards) => {
        if (!isOk(status) || cards === null) {
          resolve(status, null, null)
          return
        }

        draft_state.state = next_draft_state
        draft_state.pending_cards = cards
        resolve(status, cards, next_draft_state)
      })
    })
  })

  socket.respond('choose_cards', (resolve, session_cred, cards) => {
    const CardListT = ArrayT(CardT).asReadonly()

    if (!CardListT.guard(cards)) {
      resolve(
        makeErrStatus(
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

      const [draft_info_status, draft_state] = draftState(auth_user)
      if (!isOk(draft_info_status) || draft_state === null) {
        resolve(draft_info_status)
        return
      }

      if (draft_state.pending_cards.length === 0) {
        resolve(
          makeErrStatus(
            StatusCode.NOT_WAITING_FOR_CARD_SELECTION,
            'Draft state is not currently waiting for pending cards from the client.'
          )
        )
        return
      }

      const min_max_cards = draftStateCardLimits(draft_state.state)
      if (min_max_cards === null) {
        resolve(
          makeErrStatus(
            StatusCode.NOT_WAITING_FOR_CARD_SELECTION,
            'Draft state is not currently waiting for pending cards from the client.'
          )
        )
        return
      }
      const [min_cards, max_cards] = min_max_cards

      if (cards.length < min_cards || cards.length > max_cards) {
        resolve(
          makeErrStatus(
            StatusCode.INCORRECT_NUM_CHOSEN_CARDS,
            `Cannot choose ${cards.length} cards in state ${draft_state.state}, must choose from ${min_cards} to ${max_cards} cards`
          )
        )
        return
      }

      const chosen_cards = intersectListsPred(
        draft_state.pending_cards,
        cards,
        (pending_card, card) => pending_card.cardCode === card.cardCode
      )

      if (chosen_cards.length !== cards.length) {
        resolve(
          makeErrStatus(
            StatusCode.NOT_PENDING_CARD,
            `Some chosen cards are not pending cards, or are duplicates.`
          )
        )
        return
      }

      // Add the chosen cards to the deck.
      if (!addCardsToDeck(draft_state.deck, chosen_cards)) {
        resolve(
          makeErrStatus(
            StatusCode.ILLEGAL_CARD_COMBINATION,
            'The cards could not be added to the deck'
          )
        )
        return
      }

      draft_state.pending_cards = []

      resolve(OkStatus)
    })
  })
}

function randomChampCards(
  deck: DraftDeck,
  num_champs: number,
  allow_same_region: boolean,
  restriction_pool: Card[],
  callback: (status: Status, cards: Card[] | null) => void
): void {
  regionSets((status, region_sets) => {
    if (!isOk(status) || region_sets === null) {
      callback(status, null)
      return
    }

    const region_pool = deck.regions
    const [total_champ_count, cumulative_totals] = region_pool.reduce<
      [number, number[]]
    >(
      ([total_champ_count, cumulative_totals], region) => {
        const num_champs = region_sets[region].champs.length
        return [
          total_champ_count + num_champs,
          cumulative_totals.concat([total_champ_count]),
        ]
      },
      [0, []]
    )

    if (total_champ_count - restriction_pool.length < num_champs) {
      // If there aren't enough remaining champions not in the restriction pool,
      // remove enough champions from the restriction pool so there will be
      // enough to choose from.
      const num_necessary_duplicates = Math.max(
        num_champs + restriction_pool.length - total_champ_count,
        0
      )
      restriction_pool = restriction_pool.slice(0, num_necessary_duplicates)

      // TODO: write bumski. Should restrict total occurrences of cards in
      // restriction_pool + the randomly sampled pool + deck to no more than 3.
      // As of now, it is possible to put more than 1 copy of a card that
      // already occurs twice in the deck in the pending cards.
    }

    // List of pairs of [region_idx, set_idx], where region_idx is the index of
    // the region of the champ card chosen, and set_idx is the index of the
    // champ card within that region.
    let region_and_set_indexes: [number, number][]
    let champs: Card[]
    do {
      region_and_set_indexes =
        (randSampleNumbersAvoidingRepeats(total_champ_count, num_champs).map(
          (index) => {
            const region_idx = binarySearch(cumulative_totals, index)
            return [region_idx, index - cumulative_totals[region_idx]]
          }
        ) as [number, number][]) ?? null

      champs = region_and_set_indexes.map(([region_idx, idx]) => {
        return region_sets[region_pool[region_idx]].champs[idx]
      })
    } while (
      (!allow_same_region &&
        containsDuplicates(
          region_and_set_indexes,
          (region_and_set_idx) => region_and_set_idx[0]
        )) ||
      containsDuplicates(champs, (champ) => {
        return champ.cardCode
      }) ||
      // It may be that certain pairs of champions are incompatible in the deck,
      // but the champions individually are each compatible. This will be
      // checked for when validating 'add_cards' calls.
      champs.some((champ) => {
        return !canAddToDeck(deck, champ) || restriction_pool.includes(champ)
      })
    )

    callback(OkStatus, champs)
  })
}

/**
 * Attempts to choose `desired_num_champs` unique champs that there aren't
 * already `MAX_CARD_COPIES` copies of, returning the largest such list of
 * champs.
 * @param deck The deck to sample the champs from.
 * @param desired_num_champs The desired number of unique champs to choose.
 * @param callback Called with the result, or an error status if it failed.
 */
function randomChampCardsFromDeck(
  deck: DraftDeck,
  desired_num_champs: number,
  callback: (status: Status, cards: Card[] | null) => void
): void {
  const champs = deck.cardCounts.filter(
    (cardCount) =>
      isChampion(cardCount.card) && cardCount.count < MAX_CARD_COPIES
  )

  const num_champs = Math.min(desired_num_champs, champs.length)
  const chosenChamps =
    randSample(champs, num_champs)?.map((cardCount) => cardCount.card) ?? null
  if (chosenChamps === null) {
    callback(
      makeErrStatus(
        StatusCode.INTERNAL_SERVER_ERROR,
        'you aint got no champs to get'
      ),
      null
    )
    return
  }

  callback(OkStatus, chosenChamps)
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

export function enterDraft(
  session_info: SessionInfo,
  draft_options: DraftOptions,
  callback: (status: Status) => void
) {
  if (inDraft(session_info)) {
    callback(
      makeErrStatus(
        StatusCode.ALREADY_IN_DRAFT_SESSION,
        'Already in draft session siwwy'
      )
    )
    return
  }

  const draft_state = {
    state: DraftState.INIT,
    deck: makeDraftDeck(draft_options),
    pending_cards: [],
  }

  session_info.draft_state = draft_state
  callback(OkStatus)
}

export function exitDraft(session_info: SessionInfo): Status {
  if (!inDraft(session_info)) {
    return makeErrStatus(
      StatusCode.NOT_IN_DRAFT_SESSION,
      'Not in draft session'
    )
  }

  delete (session_info as SessionInfo).draft_state
  return OkStatus
}

function inDraft(
  session_info: SessionInfo
): session_info is InDraftSessionInfo {
  return session_info.draft_state !== undefined
}
