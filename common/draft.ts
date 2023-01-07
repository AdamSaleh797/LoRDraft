import { allRegions, Card, CardT, Region, regionContains, RegionT } from 'card'
import { Array as ArrayT, Record } from 'runtypes'

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

export const DraftDeckT = Record({
  regions: ArrayT(RegionT).asReadonly(),
  cards: ArrayT(CardT),
})

export interface DraftDeck {
  regions: readonly Region[]
  cards: Card[]
}

export function makeDraftDeck(cards: Card[] = []): DraftDeck {
  const deck: DraftDeck = {
    regions: allRegions(),
    cards: [],
  }

  cards.forEach((card) => {
    addCardToDeck(deck, card)
  })

  return deck
}

function possibleRegionsForCards(
  cards: Card[],
  possible_regions: readonly Region[]
): readonly Region[] | null {
  if (possible_regions.length === 2) {
    return possible_regions
  }

  const initial_regions_in_deck = possible_regions.reduce<Map<Region, number>>(
    (map, region) => map.set(region, 0),
    new Map()
  )
  const regions_in_deck = cards.reduce<Map<Region, number>>((map, card) => {
    possible_regions.forEach((region) => {
      if (regionContains(region, card)) {
        map.set(region, (map.get(region) ?? (0 as never)) + 1)
      }
    })
    return map
  }, initial_regions_in_deck)

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
        !cards.some(
          (card) =>
            !regionContains(region1, card) && !regionContains(region2, card)
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

export function canAddToDeck(deck: DraftDeck, card: Card): boolean {
  const cards = deck.cards.concat(card)
  return possibleRegionsForCards(cards, deck.regions) !== null
}

export function addCardToDeck(deck: DraftDeck, card: Card): boolean {
  const cards = deck.cards.concat(card)
  const new_regions = possibleRegionsForCards(cards, deck.regions)

  if (new_regions === null) {
    return false
  }

  deck.cards = cards
  deck.regions = new_regions

  return true
}

export const DraftStateInfoT = Record({
  deck: DraftDeckT,
  pending_cards: ArrayT(CardT),
})

export interface DraftStateInfo {
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
