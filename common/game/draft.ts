import { getCodeFromDeck } from 'lor-deckcodes-ts';
import { Array as ArrayT, Number, Record as RecordT } from 'runtypes';
import { DeepReadonly } from 'ts-essentials';

import {
  Card,
  CardT,
  MAX_CARD_COPIES,
  Region,
  RegionT,
  allRegions,
  cardsEqual,
  mainRegions,
  regionContains,
} from 'common/game/card';
import {
  DraftOptions,
  DraftRarityRestriction,
} from 'common/game/draft_options';
import {
  Status,
  StatusCode,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status';

export const POOL_SIZE = 4;

/**
 * The total number of cards in a complete deck.
 */
export const CARDS_PER_DECK = 40;

export const RANDOM_SELECTION_1_CARD_CUTOFF = 20;
export const RANDOM_SELECTION_2_CARD_CUTOFF = 37;
export const RANDOM_SELECTION_3_CARD_CUTOFF = 43;

export const enum DraftState {
  INIT = 'INIT',
  INITIAL_SELECTION = 'INITIAL_SELECTION',
  RANDOM_SELECTION_1 = 'RANDOM_SELECTION_1',
  CHAMP_ROUND_1 = 'CHAMP_ROUND_1',
  RANDOM_SELECTION_2 = 'RANDOM_SELECTION_2',
  CHAMP_ROUND_2 = 'CHAMP_ROUND_2',
  RANDOM_SELECTION_3 = 'RANDOM_SELECTION_3',
  CHAMP_ROUND_3 = 'CHAMP_ROUND_3',
  // TRIM_DECK = 'TRIM_DECK',
  GENERATE_CODE = 'GENERATE_CODE',
}

export const CardCountT = RecordT({
  card: CardT,
  count: Number,
});

export interface CardCount {
  card: Card;
  count: number;
}

export const DraftDeckT = RecordT({
  regions: ArrayT(RegionT).asReadonly(),
  cardCounts: ArrayT(CardCountT),
  numCards: Number,
});

export interface DraftDeck {
  regions: readonly Region[];
  cardCounts: readonly Readonly<CardCount>[];
  numCards: number;
  options: DraftOptions;
}

export function findCardCount(
  card_case: readonly CardCount[],
  card: Card
): CardCount | null {
  return (
    card_case.find((card_count) => {
      return card.cardCode === card_count.card.cardCode;
    }) ?? null
  );
}

export function addToCardCounts(
  card_counts: readonly CardCount[],
  card: Card
): CardCount[] {
  const idx = card_counts.findIndex((card_count) => {
    return card.cardCode === card_count.card.cardCode;
  });

  if (idx === -1) {
    return card_counts.concat({
      card: card,
      count: 1,
    });
  } else {
    const copy = card_counts.slice();
    copy[idx] = {
      card: copy[idx].card,
      count: copy[idx].count + 1,
    };
    return copy;
  }
}

export function makeDraftDeck(
  options: DraftOptions,
  cards: Card[] = []
): DraftDeck {
  let regions;
  if (options.draftFormat === 'FREE_BUILD') {
    regions = allRegions();
  } else {
    switch (options.rarityRestriction) {
      case DraftRarityRestriction.COMMONS: {
        regions = mainRegions();
        break;
      }
      case DraftRarityRestriction.ANY_RARITY: {
        regions = allRegions();
        break;
      }
    }
  }

  const deck: DraftDeck = {
    regions: regions,
    cardCounts: [],
    numCards: 0,
    options: options,
  };

  cards.forEach((card) => {
    addCardToDeck(deck, card);
  });

  return deck;
}

export function copyDraftDeck(draft_deck: DraftDeck): DraftDeck {
  return {
    regions: draft_deck.regions.slice(),
    cardCounts: draft_deck.cardCounts.map((card_count) => ({
      ...card_count,
    })),
    numCards: draft_deck.numCards,
    options: draft_deck.options,
  };
}

export function deckContainsCard(deck: DraftDeck, card: Card): boolean {
  return deck.cardCounts.some(({ card: deckCard }) =>
    cardsEqual(deckCard, card)
  );
}

/**
 * Calculates all possible pairs of regions that the list of cards can be
 * compatible with.
 *
 * This will return an empty list if `card_counts` is empty.
 *
 * @param cards The list of cards in the deck.
 * @param possible_regions The list of possible regions that the deck can be in.
 * @returns A list of possible region pairs for the cards given.
 */
function possibleRegionPairs(
  card_counts: readonly Readonly<CardCount>[],
  possible_regions: readonly Region[]
): [Region, Region][] {
  const initial_regions_in_deck = possible_regions.reduce<
    Partial<Record<Region, number>>
  >((map, region) => ({ ...map, [region]: 0 }), {});
  const regions_in_deck = card_counts.reduce<Partial<Record<Region, number>>>(
    (map, card_count) => {
      possible_regions.forEach((region) => {
        if (regionContains(region, card_count.card)) {
          map[region] = (map[region] ?? (0 as never)) + 1;
        }
      });
      return map;
    },
    initial_regions_in_deck
  );

  // Sort regions in non-increasing order of size
  const region_search_order = Array.from(
    Object.entries(regions_in_deck) as [Region, number][]
  )
    .sort((a, b) => b[1] - a[1])
    .map((region_count) => region_count[0]);

  const region_pairs: [Region, Region][] = [];

  for (let i = 1; i < region_search_order.length; i++) {
    const region1 = region_search_order[i];

    for (let j = 0; j < i; j++) {
      const region2 = region_search_order[j];

      // If both regions are size 0, we don't need to check them, as they are
      // trivially not a possible pairing of regions.
      if ((regions_in_deck[region2] ?? (0 as never)) === 0) {
        break;
      }

      if (
        !card_counts.some(
          (card_count) =>
            !regionContains(region1, card_count.card) &&
            !regionContains(region2, card_count.card)
        )
      ) {
        // region1 and region2 are valid regions to choose for this deck.
        region_pairs.push([region1, region2]);
      }
    }
  }

  return region_pairs;
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
  card_counts: CardCount[],
  possible_regions: readonly Region[]
): Region[] | null {
  const region_set = new Set<Region>();
  possibleRegionPairs(card_counts, possible_regions).forEach(
    ([region1, region2]) => {
      region_set.add(region1);
      region_set.add(region2);
    }
  );

  if (region_set.size === 0) {
    // This deck would be invalid if the card were added to it.
    return null;
  }

  return Array.from(region_set.values());
}

/**
 * Given the draft deck, returns the list of regions that are certainly in the
 * draft. The remaining regions in `deck.regions` may possibly be included, but
 * there exist combinations of regions that don't include them.
 */
export function certainRegionsForDeck(deck: DraftDeck): readonly Region[] {
  // If there are only two possible regions, they are certainly the only two
  // regions for the deck.
  if (deck.regions.length === 2) {
    return deck.regions;
  }
  // If no cards have been chosen, all regions are uncertain.
  if (deck.cardCounts.length === 0) {
    return [];
  }

  let regions_in_all_pairs = deck.regions;
  for (const region_pair of possibleRegionPairs(
    deck.cardCounts,
    deck.regions
  )) {
    regions_in_all_pairs = regions_in_all_pairs.filter((region) =>
      region_pair.includes(region)
    );

    // If we've already eliminated all regions from the list of regions in all
    // pairs, we can return early.
    if (regions_in_all_pairs.length === 0) {
      break;
    }
  }

  return regions_in_all_pairs;
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
      (card_count) => card_count.card.cardCode === card.cardCode
    )?.count ?? 0) === MAX_CARD_COPIES
  ) {
    return false;
  }

  // In free build, regions don't matter.
  if (deck.options.draftFormat === 'FREE_BUILD') {
    return true;
  }

  // If the deck only has two possible regions, these must be the two regions
  // for the deck. We can simply check if this card is in either of those two
  // regions.
  if (deck.regions.length === 2) {
    return deck.regions.some((region) => regionContains(region, card));
  }

  const card_counts = addToCardCounts(deck.cardCounts, card);
  return possibleRegionsForCards(card_counts, deck.regions) !== null;
}

/**
 * Adds a card to the deck.
 * @param deck The deck to add `card` to.
 * @param card The card to be added.
 * @returns True if the card was successfully added, or false if the card
 * could not be added because adding it would violate a rule of deck building.
 */
export function addCardToDeck(deck: DraftDeck, card: Card): boolean {
  const card_counts = addToCardCounts(deck.cardCounts, card);
  let new_regions;
  if (deck.options.draftFormat === 'FREE_BUILD') {
    new_regions = deck.regions;
  } else if (deck.regions.length === 2) {
    // If the deck only has two possible regions, these must be the two regions
    // for the deck. We can simply check if this card is in either of those two
    // regions.
    if (deck.regions.some((region) => regionContains(region, card))) {
      new_regions = deck.regions;
    } else {
      // If neither of the two regions of the deck contain the card, this card
      // can't be added.
      return false;
    }
  } else {
    // Otherwise, we have to narrow the possible remaining regions.
    new_regions = possibleRegionsForCards(card_counts, deck.regions);

    if (new_regions === null) {
      return false;
    }
  }

  deck.cardCounts = card_counts;
  deck.regions = new_regions;
  deck.numCards++;

  return true;
}

/**
 * Adds a list of cards to the deck.
 * @param deck The deck to add `cards` to.
 * @param cards The cards to be added.
 * @returns The new deck if the cards were all successfully added, or null if
 * any card could not be added, not mutating the deck.
 */
export function addCardsToDeck(
  deck: DeepReadonly<DraftDeck>,
  cards: Card[]
): DraftDeck | null {
  const new_deck = { ...deck };
  if (cards.some((card) => !addCardToDeck(new_deck, card))) {
    return null;
  } else {
    return new_deck;
  }
}

export const DraftStateInfoT = RecordT({
  deck: DraftDeckT,
  pendingCards: ArrayT(CardT),
});

export interface DraftStateInfo {
  state: DraftState;
  deck: DraftDeck;
  pendingCards: Card[];
}

export function draftStateCardLimits(
  draft_state: DraftState
): [number, number] | null {
  switch (draft_state) {
    case DraftState.INIT: {
      return null;
    }
    case DraftState.INITIAL_SELECTION: {
      return [2, 2];
    }
    case DraftState.RANDOM_SELECTION_1:
    case DraftState.RANDOM_SELECTION_2:
    case DraftState.RANDOM_SELECTION_3: {
      return [1, 1];
    }
    case DraftState.CHAMP_ROUND_1:
    case DraftState.CHAMP_ROUND_2: {
      return [0, 2];
    }
    case DraftState.CHAMP_ROUND_3: {
      return [0, 2];
    }
    // case DraftState.TRIM_DECK: {
    //   return [5, 5]
    // }
    case DraftState.GENERATE_CODE: {
      return null;
    }
  }
}

export function getDeckCode(deck: DraftDeck): Status<string> {
  if (deck.numCards < CARDS_PER_DECK) {
    return makeErrStatus(
      StatusCode.INCORRECT_NUM_CHOSEN_CARDS,
      `Cannot generate deck code for deck, expect ${CARDS_PER_DECK} cards, found ${deck.numCards}.`
    );
  }

  const deckcodes_deck = deck.cardCounts.map((card_count) => ({
    cardCode: card_count.card.cardCode,
    count: card_count.count,
  }));

  return makeOkStatus(getCodeFromDeck(deckcodes_deck));
}
