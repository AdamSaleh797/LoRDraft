import { Card, cardsEqual, isChampion, regionContains } from 'common/game/card'
import {
  DraftDeck,
  DraftState,
  DraftStateInfo,
  POOL_SIZE,
  RANDOM_SELECTION_1_CARD_CUTOFF,
  RANDOM_SELECTION_2_CARD_CUTOFF,
  RANDOM_SELECTION_3_CARD_CUTOFF,
  addCardsToDeck,
  canAddToDeck,
  draftStateCardLimits,
  makeDraftDeck,
} from 'common/game/draft'
import {
  DraftOptions,
  DraftOptionsT,
  DraftRarityRestriction,
  formatContainsCard,
} from 'common/game/draft_options'
import { CardListT, LoRDraftSocket } from 'common/game/socket-msgs'
import {
  arrayCount,
  binarySearch,
  containsDuplicates,
  intersectListsPred,
  randChoice,
  randSample,
  randSampleNumbers,
} from 'common/util/lor_util'
import {
  OkStatus,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status'

import { LoggedInAuthUser, joinSession } from 'server/auth'
import { SessionInfo } from 'server/session'
import { regionSets } from 'server/set_packs'

const GUARANTEED_CHAMP_COUNT = 2
const RESTRICTED_POOL_DRAFT_STATES = [
  DraftState.CHAMP_ROUND_1,
  DraftState.CHAMP_ROUND_2,
  // DraftState.CHAMP_ROUND_3,
]

const MAX_CARD_REPICK_ITERATIONS = 200

interface InDraftSessionInfo extends SessionInfo {
  draftState: DraftStateInfo
}

function chooseChampCards(
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

function chooseNonChampCards(
  deck: DraftDeck,
  callback: (cards: Status<Card[]>) => void
) {
  randomNonChampCards(deck, POOL_SIZE, callback)
}

function draftState(auth_user: LoggedInAuthUser): Status<DraftStateInfo> {
  if (!inDraft(auth_user.sessionInfo)) {
    return makeErrStatus(
      StatusCode.NOT_IN_DRAFT_SESSION,
      'No draft session found.'
    )
  } else {
    return makeOkStatus(auth_user.sessionInfo.draftState)
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
function chooseNextCards(
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

  const cardsCallback = (status: Status<Card[]>) => {
    if (!isOk(status)) {
      callback(status)
      return
    }

    // If cards were chosen successfully, then update the draft state.
    draft_state.pendingCards = status.value
    draft_state.state = next_draft_state
    callback(OkStatus)
  }

  const champCardsCallback = (status: Status<Card[]>) => {
    if (!isOk(status)) {
      callback(status)
      return
    }

    // Update the draft state.
    draft_state.state = next_draft_state

    const cards = status.value
    if (cards.length === 0) {
      // If no champs were chosen, move immediately to the next round (which is
      // a non-champ round).
      chooseNextCards(draft_state, callback)
    } else {
      // If cards were chosen successfully, then update the draft state.
      draft_state.pendingCards = cards
      callback(OkStatus)
    }
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
      chooseChampCards(
        next_draft_state,
        draft_state.deck,
        champCardsCallback,
        false
      )
      return
    }
    case DraftState.CHAMP_ROUND_1:
    case DraftState.CHAMP_ROUND_2: {
      chooseChampCards(next_draft_state, draft_state.deck, champCardsCallback)
      return
    }
    case DraftState.RANDOM_SELECTION_1:
    case DraftState.RANDOM_SELECTION_2:
    case DraftState.RANDOM_SELECTION_3: {
      chooseNonChampCards(draft_state.deck, cardsCallback)
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
    joinSession(session_cred, (auth_user_status) => {
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

    joinSession(session_cred, (status) => {
      if (!isOk(status)) {
        resolve(status)
        return
      }
      const auth_user = status.value

      enterDraft(auth_user.sessionInfo, draft_options, resolve)
    })
  })

  socket.respond('close_draft', (resolve, session_cred) => {
    joinSession(session_cred, (status) => {
      if (!isOk(status)) {
        resolve(status)
        return
      }
      const auth_user = status.value

      resolve(exitDraft(auth_user.sessionInfo))
    })
  })

  socket.respond('choose_cards', (resolve, session_cred, cards) => {
    if (!CardListT.guard(cards)) {
      resolve(
        makeErrStatus(
          StatusCode.INCORRECT_MESSAGE_ARGUMENTS,
          `Argument \`cards\` to 'choose_cards' is not of the correct type.`
        )
      )
      return
    }

    joinSession(session_cred, (status) => {
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

      if (draft_state.pendingCards.length === 0) {
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
        draft_state.pendingCards,
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

      chooseNextCards(draft_state, (status) => {
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

/**
 * Chooses up to `num_champs` random champions from the set of champions that
 * can be added to the deck.
 */
function randomChampCards(
  deck: DraftDeck,
  num_champs: number,
  allow_same_region: boolean,
  restriction_pool: Card[],
  callback: (cards: Status<Card[]>) => void
): void {
  // For commons-only drafts, no champs can be chosen.
  if (deck.options.rarityRestriction === DraftRarityRestriction.COMMONS) {
    callback(makeOkStatus([]))
    return
  }

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
      ([total_champ_count, cumulative_totals], region) => [
        total_champ_count + region_sets[region].champs.length,
        cumulative_totals.concat([total_champ_count]),
      ],
      [0, []]
    )

    // Ineligible champs are cards that, if chosen, would trigger a re-pick.
    // These must match the conditions checked in the loop below, otherwise it
    // is possible to attempt choosing more cards than possible.
    const ineligible_champs = restriction_pool.concat(
      deck.cardCounts
        .filter(
          ({ card }) =>
            isChampion(card) &&
            (!canAddToDeck(deck, card) ||
              restriction_pool.some((res_card) => cardsEqual(res_card, card)))
        )
        .map(({ card }) => card)
    )

    const total_eligible_champ_count =
      total_champ_count -
      region_pool.reduce(
        (count, region) =>
          count +
          arrayCount(ineligible_champs, (card) => regionContains(region, card)),
        0
      )
    // TODO: total_eligible_champ_count still double counts eligible
    // multi-region cards, and doesn't account for the draft options. I can't
    // think of an example where this would lead to over estimating the number
    // of cards you can choose, where the true number is less than 4, so for now
    // this edge case is uncovered.

    const cards_to_choose = Math.min(num_champs, total_eligible_champ_count)

    // List of pairs of [region_idx, set_idx], where region_idx is the index of
    // the region of the champ card chosen, and set_idx is the index of the
    // champ card within that region.
    let region_and_set_indexes: [number, number][]
    let champs: Card[]
    let iterations = 0
    do {
      iterations++
      if (iterations > MAX_CARD_REPICK_ITERATIONS) {
        callback(
          makeErrStatus(
            StatusCode.INTERNAL_SERVER_ERROR,
            `Failed to find a set of champions after ${MAX_CARD_REPICK_ITERATIONS} attempts`
          )
        )
        return
      }

      const region_and_set_indexes_result = randSampleNumbers(
        total_champ_count,
        cards_to_choose
      )?.map((index) => {
        const region_idx = binarySearch(cumulative_totals, index)
        return [region_idx, index - cumulative_totals[region_idx]] as [
          number,
          number
        ]
      })

      if (region_and_set_indexes_result === undefined) {
        callback(
          makeErrStatus(
            StatusCode.INTERNAL_SERVER_ERROR,
            'Failed to select champion cards'
          )
        )
        return
      }
      region_and_set_indexes = region_and_set_indexes_result

      champs = region_and_set_indexes.map(
        ([region_idx, idx]) => region_sets[region_pool[region_idx]].champs[idx]
      )
    } while (
      (!allow_same_region &&
        cards_to_choose <= region_pool.length &&
        containsDuplicates(
          region_and_set_indexes,
          (region_and_set_idx) => region_and_set_idx[0]
        )) ||
      // Each card that is multi-region between the region pool is more likely
      // to be chosen by a factor of how many regions they are in. Normalize
      // this probability by only selecting each card once every N times, where
      // N is the number of regions they are in.
      champs.reduce(
        (norm_factor, champ) =>
          norm_factor *
          (1 /
            arrayCount(region_pool, (region) => regionContains(region, champ))),
        1
      ) < Math.random() ||
      // Don't pick ineligible cards.
      champs.some((champ) => !formatContainsCard(deck.options, champ)) ||
      // It is possible for multi-region cards to be selected multiple times.
      containsDuplicates(champs, (champ) => {
        return champ.cardCode
      }) ||
      // Verify that all champs are legal in the deck, and are not part of the
      // restriction pool.
      //
      // It may be that certain pairs of champions are incompatible in the deck,
      // but the champions individually are each compatible. This will be
      // checked for when validating 'choose_cards' calls.
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
    ({ card }) => isChampion(card) && canAddToDeck(deck, card)
  )

  const num_champs = Math.min(desired_num_champs, champs.length)
  const chosen_champs =
    randSample(champs, num_champs)?.map((card_count) => card_count.card) ?? null
  if (chosen_champs === null) {
    callback(
      makeErrStatus(
        StatusCode.INTERNAL_SERVER_ERROR,
        'you aint got no champs to get'
      )
    )
    return
  }

  callback(makeOkStatus(chosen_champs))
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
      if (iterations > MAX_CARD_REPICK_ITERATIONS) {
        callback(
          makeErrStatus(
            StatusCode.MAX_REDRAWS_EXCEEDED,
            'Failed to choose cards after many attempts.'
          )
        )
        return
      }

      const region = randChoice(region_pool)
      const card = randChoice(region_sets[region].nonChamps)

      if (cards.includes(card) || !formatContainsCard(deck.options, card)) {
        continue
      }

      // Find all regions this card matches from the region_pool.
      const regions = region_pool.filter((region) =>
        regionContains(region, card)
      )

      if (regions.length > 1) {
        // For multi-region cards, take a card with 1/region_size / (sum of
        // 1/region_size from region_pool) odds. This will distribute
        // multi-region cards across all the regions they are in, weighting them
        // relatively more heavily in regions which are smaller (so who's cards
        // are more likely to be chosen).
        //
        // A motivating example: consider a card in two regions, one with 2
        // cards, and another with 100. The cards in region 1 have a 1/4 chance
        // of being chosen, while cards in region 2 have a 1/200 chance of being
        // chosen. If there is a multi-region card in both of those regions,
        // we would want it to be almost as likely to be chosen as the other
        // card in region 1, since it shouldn't be considered a much
        // lesser-probability card by its presence in region 2. By taking this
        // weighted probability, the chance that this multi-region card is
        // chosen is around 24.5%, which is very close to 25%. The multi-region
        // card's presence in the large region hardly dilutes its chance of
        // being chosen. Additionally, this probability approaches 1/4 as the
        // size of the other region approaches infinity.
        const region_size = region_sets[region].nonChamps.length
        const weighted_sizes = regions.reduce<number>(
          (sum, region) => sum + 1 / region_sets[region].nonChamps.length,
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
    pendingCards: [],
  }

  // Choose the first set of pending cards to show.
  chooseNextCards(draft_state, (status) => {
    if (!isOk(status)) {
      callback(status)
      return
    }

    // Since choose_next_cards is async, we need to check again that we're not
    // already in a draft. It's possible another request to join a draft
    // finished processing between when we last checked and now.
    if (inDraft(session_info)) {
      callback(
        makeErrStatus(
          StatusCode.ALREADY_IN_DRAFT_SESSION,
          'Already in draft session!'
        )
      )
      return
    }

    // If successful, join the draft by adding it to the session info.
    session_info.draftState = draft_state
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

  delete (session_info as SessionInfo).draftState
  return OkStatus
}

function inDraft(
  session_info: SessionInfo
): session_info is InDraftSessionInfo {
  return session_info.draftState !== undefined
}
