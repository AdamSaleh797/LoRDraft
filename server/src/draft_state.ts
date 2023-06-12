import { Array as ArrayT } from 'runtypes'

import {
  Card,
  CardT,
  MAX_CARD_COPIES,
  isChampion,
  regionContains,
} from 'common/game/card'
import {
  DraftDeck,
  DraftState,
  DraftStateInfo,
  POOL_SIZE,
  addCardsToDeck,
  canAddToDeck,
  draftStateCardLimits,
  makeDraftDeck,
} from 'common/game/draft'
import {
  DraftOptions,
  DraftOptionsT,
  formatContainsCard,
} from 'common/game/draft_options'
import { LoRDraftSocket } from 'common/game/socket-msgs'
import {
  binarySearch,
  containsDuplicates,
  intersectListsPred,
  randChoice,
  randSample,
  randSampleNumbersAvoidingRepeats,
} from 'common/util/lor_util'
import {
  OkStatus,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status'

import { LoggedInAuthUser, join_session } from 'server/auth'
import { SessionInfo } from 'server/session'
import { regionSets } from 'server/set_packs'

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

interface InDraftSessionInfo extends SessionInfo {
  draft_state: DraftStateInfo
}

function choose_champ_cards(
  draft_state: DraftState,
  deck: DraftDeck,
  callback: (champ_cards: Status<Card[]>) => void,
  allow_same_region = true
) {
  const num_guaranteed_champs = RESTRICTED_POOL_DRAFT_STATES.includes(
    draft_state
  )
    ? GUARANTEED_CHAMP_COUNT
    : 0

  randomChampCardsFromDeck(deck, num_guaranteed_champs, (status) => {
    if (!isOk(status)) {
      callback(status)
      return
    }
    const guaranteed_cards = status.value

    randomChampCards(
      deck,
      POOL_SIZE - guaranteed_cards.length,
      allow_same_region,
      guaranteed_cards,
      (status) => {
        if (!isOk(status)) {
          callback(status)
          return
        }

        callback(makeOkStatus(guaranteed_cards.concat(status.value)))
      }
    )
  })
}

function choose_non_champ_cards(
  deck: DraftDeck,
  callback: (cards: Status<Card[]>) => void
) {
  randomNonChampCards(deck, POOL_SIZE, callback)
}

function draftState(auth_user: LoggedInAuthUser): Status<DraftStateInfo> {
  if (!inDraft(auth_user.session_info)) {
    return makeErrStatus(
      StatusCode.NOT_IN_DRAFT_SESSION,
      'No draft session found.'
    )
  } else {
    return makeOkStatus(auth_user.session_info.draft_state)
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

/**
 * Chooses the next set of cards for draft state `draft_state`, adding the
 * chosen cards to the `pending_cards` of the state and potentially changing
 * the `state` if successful. If this fails, `callback` will be called with a
 * non-OK status and `draft_state` will not have changed.
 */
function choose_next_cards(
  draft_state: DraftStateInfo,
  callback: (status: Status) => void
) {
  const cur_state = draft_state.state
  const next_draft_state = nextDraftState(cur_state, draft_state.deck)
  if (next_draft_state === null) {
    callback(
      makeErrStatus(
        StatusCode.DRAFT_COMPLETE,
        'The draft is complete, no more card selections to be made.'
      )
    )
    return
  }

  const cards_callback = (status: Status<Card[]>) => {
    if (!isOk(status)) {
      callback(status)
      return
    }

    // If cards were chosen successfully, then update the draft state.
    draft_state.pending_cards = status.value
    draft_state.state = next_draft_state
    callback(OkStatus)
  }

  switch (next_draft_state) {
    case DraftState.INIT: {
      callback(
        makeErrStatus(
          StatusCode.INTERNAL_SERVER_ERROR,
          'Cannot have next draft state be `INIT`.'
        )
      )
      return
    }
    case DraftState.INITIAL_SELECTION: {
      choose_champ_cards(cur_state, draft_state.deck, cards_callback, false)
      return
    }
    case DraftState.CHAMP_ROUND_1:
    case DraftState.CHAMP_ROUND_2: {
      choose_champ_cards(cur_state, draft_state.deck, cards_callback)
      return
    }
    case DraftState.RANDOM_SELECTION_1:
    case DraftState.RANDOM_SELECTION_2:
    case DraftState.RANDOM_SELECTION_3: {
      choose_non_champ_cards(draft_state.deck, cards_callback)
      return
    }
    case DraftState.GENERATE_CODE: {
      callback(
        makeErrStatus(
          StatusCode.DRAFT_COMPLETE,
          'The draft is complete, no more card selections to be made.'
        )
      )
      return
    }
  }
}

export function initDraftState(socket: LoRDraftSocket) {
  socket.respond('current_draft', (resolve, session_cred) => {
    join_session(session_cred, (auth_user_status) => {
      if (!isOk(auth_user_status)) {
        resolve(auth_user_status)
        return
      }
      const auth_user = auth_user_status.value

      resolve(draftState(auth_user))
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

    join_session(session_cred, (status) => {
      if (!isOk(status)) {
        resolve(status)
        return
      }
      const auth_user = status.value

      enterDraft(auth_user.session_info, draft_options, resolve)
    })
  })

  socket.respond('close_draft', (resolve, session_cred) => {
    join_session(session_cred, (status) => {
      if (!isOk(status)) {
        resolve(status)
        return
      }
      const auth_user = status.value

      resolve(exitDraft(auth_user.session_info))
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

    join_session(session_cred, (status) => {
      if (!isOk(status)) {
        resolve(status)
        return
      }
      const auth_user = status.value

      const draft_state_status = draftState(auth_user)
      if (!isOk(draft_state_status)) {
        resolve(draft_state_status)
        return
      }
      const draft_state = draft_state_status.value

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

      choose_next_cards(draft_state, (status) => {
        if (!isOk(status)) {
          resolve(status)
          return
        }

        // If OK, `choose_next_cards` will have updated `draft_state`, so
        // return it directly.
        resolve(makeOkStatus(draft_state))
      })
    })
  })
}

function randomChampCards(
  deck: DraftDeck,
  num_champs: number,
  allow_same_region: boolean,
  restriction_pool: Card[],
  callback: (cards: Status<Card[]>) => void
): void {
  regionSets((status) => {
    if (!isOk(status)) {
      callback(status)
      return
    }
    const region_sets = status.value

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

    callback(makeOkStatus(champs))
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
  callback: (cards: Status<Card[]>) => void
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
      )
    )
    return
  }

  callback(makeOkStatus(chosenChamps))
}

function randomNonChampCards(
  deck: DraftDeck,
  num_champs: number,
  callback: (cards: Status<Card[]>) => void
): void {
  regionSets((status) => {
    if (!isOk(status)) {
      callback(status)
      return
    }
    const region_sets = status.value

    const cards: Card[] = []
    const region_pool = deck.regions
    let iterations = 0

    do {
      iterations++

      const region = randChoice(region_pool)
      const card = randChoice(region_sets[region].nonChamps)

      if (cards.includes(card) || !formatContainsCard(deck.options, card)) {
        if (iterations >= MAX_CARD_REPICK_ITERATIONS) {
          callback(
            makeErrStatus(
              StatusCode.MAX_REDRAWS_EXCEEDED,
              'Failed to choose cards after many attempts.'
            )
          )
          return
        }

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

    callback(makeOkStatus(cards))
  })
}

export function enterDraft(
  session_info: SessionInfo,
  draft_options: DraftOptions,
  callback: (status: Status<DraftStateInfo>) => void
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

  // Choose the first set of pending cards to show.
  choose_next_cards(draft_state, (status) => {
    if (!isOk(status)) {
      callback(status)
      return
    }

    // If successful, join the draft by adding it to the session info.
    session_info.draft_state = draft_state
    callback(makeOkStatus(draft_state))
  })
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
