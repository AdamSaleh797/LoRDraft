import {
  allRegions,
  Card,
  CardT,
  MAX_CARD_COPIES,
  Region,
  regionContains,
  RegionT,
} from 'card'
import { DraftOptions } from 'draft_options'
import { getCodeFromDeck } from 'lor-deckcodes-ts'
import {
  Array as ArrayT,
  Null,
  Number,
  Record as RecordT,
  String,
  Union,
} from 'runtypes'

export const POOL_SIZE = 4

export const enum DraftState {
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

export const CardCountT = RecordT({
  card: CardT,
  count: Number,
})

export interface CardCount {
  card: Card
  count: number
}

export const DraftDeckT = RecordT({
  regions: ArrayT(RegionT).asReadonly(),
  cardCounts: ArrayT(CardCountT),
  numCards: Number,
  deckCode: Union(String, Null),
})

export interface DraftDeck {
  regions: readonly Region[]
  cardCounts: CardCount[]
  numCards: number
  deckCode: string | null
  options: DraftOptions
}

export function addToCardCounts(
  cardCounts: readonly CardCount[],
  card: Card
): CardCount[] {
  const idx = cardCounts.findIndex((cardCount) => {
    return card.cardCode === cardCount.card.cardCode
  })

  if (idx === -1) {
    return cardCounts.concat({
      card: card,
      count: 1,
    })
  } else {
    const copy = cardCounts.slice()
    copy[idx] = {
      card: copy[idx].card,
      count: copy[idx].count + 1,
    }
    return copy
  }
}

export function makeDraftDeck(
  options: DraftOptions,
  cards: Card[] = []
): DraftDeck {
  const deck: DraftDeck = {
    regions: allRegions(),
    cardCounts: [],
    numCards: 0,
    deckCode: null,
    options: options,
  }

  cards.forEach((card) => {
    addCardToDeck(deck, card)
  })

  return deck
}

/**
 * Calculates all possible regions that the list of cards can be compatible with
 * by taking the union of all sets of pairs of regions from `regions` that are
 * valid with `cards`.
 *
 * @param cards The list of cards in the deck.
 * @param possible_regions The list of possible regions that the deck can be in.
 * @returns A narrowed list of regions for the cards given, or `null` if the
 * cards do not make a valid deck.
 */
function possibleRegionsForCards(
  cardCounts: CardCount[],
  possible_regions: readonly Region[]
): readonly Region[] | null {
  if (possible_regions.length === 2) {
    return possible_regions
  }

  const initial_regions_in_deck = possible_regions.reduce<Map<Region, number>>(
    (map, region) => map.set(region, 0),
    new Map()
  )
  const regions_in_deck = cardCounts.reduce<Map<Region, number>>(
    (map, cardCount) => {
      possible_regions.forEach((region) => {
        if (regionContains(region, cardCount.card)) {
          map.set(region, (map.get(region) ?? (0 as never)) + 1)
        }
      })
      return map
    },
    initial_regions_in_deck
  )

  // Sort regions in non-increasing order of size
  const region_search_order = Array.from(regions_in_deck.entries())
    .sort((a, b) => b[1] - a[1])
    .map((region_count) => region_count[0])

  const region_set = new Set<Region>()

  for (let i = 1; i < region_search_order.length; i++) {
    const region1 = region_search_order[i]
    for (let j = 0; j < i; j++) {
      const region2 = region_search_order[j]

      // If both regions are size 0, we don't need to check them, as they are
      // trivially not a possible pairing of regions.
      if ((regions_in_deck.get(region2) ?? 0) === 0) {
        break
      }

      if (
        !cardCounts.some(
          (cardCount) =>
            !regionContains(region1, cardCount.card) &&
            !regionContains(region2, cardCount.card)
        )
      ) {
        // region1 and region2 are valid regions to choose for this deck.
        region_set.add(region1)
        region_set.add(region2)
      }
    }
  }

  if (region_set.size === 0) {
    // This deck would be invalid if the card were added to it.
    return null
  }

  return Array.from(region_set.values())
}

/**
 * Checks if `card` can be added to `deck` without breaking the rule that decks
 * can be from at most two regions, and each card in the deck must be from at
 * least one of those two regions, and there can be no more than three copies
 * of each card.
 * @param deck The deck to check.
 * @param card The card to be added.
 * @returns True if `card` can be added to `deck`.
 */
export function canAddToDeck(deck: DraftDeck, card: Card): boolean {
  if (
    (deck.cardCounts.find(
      (cardCount) => cardCount.card.cardCode === card.cardCode
    )?.count ?? 0) === MAX_CARD_COPIES
  ) {
    return false
  }
  const cardCounts = addToCardCounts(deck.cardCounts, card)
  return possibleRegionsForCards(cardCounts, deck.regions) !== null
}

/**
 * Adds a card to the deck.
 * @param deck The deck to add `card` to.
 * @param card The card to be added.
 * @returns True if the card was successfully added, or false if the card
 * could not be added because adding it would violate a rule of deck building.
 */
export function addCardToDeck(deck: DraftDeck, card: Card): boolean {
  const cardCounts = addToCardCounts(deck.cardCounts, card)
  const new_regions = possibleRegionsForCards(cardCounts, deck.regions)

  if (new_regions === null) {
    return false
  }

  deck.cardCounts = cardCounts
  deck.regions = new_regions
  deck.numCards++

  return true
}

/**
 * Adds a list of cards to the deck.
 * @param deck The deck to add `card` to.
 * @param card The card to be added.
 * @returns True if the card was successfully added, or false if the card
 * could not be added because adding it would violate a rule of deck building.
 */
export function addCardsToDeck(deck: DraftDeck, cards: Card[]): boolean {
  const old_deck = { ...deck }
  if (cards.some((card) => !addCardToDeck(deck, card))) {
    // Restore the initial state of deck.
    Object.assign(deck, old_deck.cardCounts)
    return false
  } else {
    return true
  }
}

export const DraftStateInfoT = RecordT({
  deck: DraftDeckT,
  pending_cards: ArrayT(CardT),
})

export interface DraftStateInfo {
  state: DraftState
  deck: DraftDeck
  pending_cards: Card[]
}

export function draftStateCardLimits(
  draftState: DraftState
): [number, number] | null {
  switch (draftState) {
    case DraftState.INITIAL_SELECTION: {
      return [2, 2]
    }
    case DraftState.RANDOM_SELECTION_1:
    case DraftState.RANDOM_SELECTION_2:
    case DraftState.RANDOM_SELECTION_3: {
      return [1, 1]
    }
    case DraftState.CHAMP_ROUND_1:
    case DraftState.CHAMP_ROUND_2:
    case DraftState.CHAMP_ROUND_3: {
      return [0, 2]
    }
    case DraftState.TRIM_DECK: {
      return [5, 5]
    }
    case DraftState.INIT:
    case DraftState.GENERATE_CODE: {
      return null
    }
  }
}

export function generateDeckCode(deck: DraftDeck): string {
  const deckcodesDeck = deck.cardCounts.map((cardCount) => ({
    cardCode: cardCount.card.cardCode,
    count: cardCount.count,
  }))

  return getCodeFromDeck(deckcodesDeck)
}
