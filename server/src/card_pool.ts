import { Card, cardsEqual, isChampion, regionContains } from 'common/game/card';
import { DraftDeck, canAddToDeck, deckContainsCard } from 'common/game/draft';
import { formatContainsCard } from 'common/game/draft_options';
import {
  arrayCount,
  binarySearch,
  containsDuplicates,
  randSample,
  randSampleNumbers,
} from 'common/util/lor_util';
import {
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status';

import { RegionSet, regionSets } from 'server/set_packs';

const MAX_CARD_REPICK_ITERATIONS = 200;

export enum CardType {
  CHAMP = 'CHAMP',
  NON_CHAMP = 'NON_CHAMP',
}

export enum SampleMode {
  /**
   * Every possible card has an equal probability of being chosen.
   */
  UNIFORM = 'UNIFORM',
  /**
   * Each region has an equal probability of being chosen, and each card within
   * each region has an equal probability.
   */
  REGION_WEIGHTED = 'REGION_WEIGHTED',
}

export enum SelectionMode {
  /**
   * Any card can be chosen, regardless of whether it's in the deck already.
   */
  ANY_CARD = 'ANY_CARD',
  /**
   * Only cards that are already in the deck are chosen.
   */
  FROM_DECK = 'FROM_DECK',
  /**
   * Only cards that are not in the deck are chosen.
   */
  NOT_FROM_DECK = 'NOT_FROM_DECK',
}

function sampleCardsByRegion(
  total_num_cards: number,
  cumulative_totals: number[],
  cards_to_choose: number
): [number, number][] {
  if (cards_to_choose > total_num_cards) {
    console.error('Cannot choose more cards than available');
    return [];
  }

  const counts = cumulative_totals.concat(total_num_cards);
  const result: [number, number][] = [];
  while (result.length < cards_to_choose) {
    const random_region = Math.floor(Math.random() * cumulative_totals.length);
    const random_card = Math.floor(
      Math.random() * (counts[random_region + 1] - counts[random_region])
    );
    if (!result.includes([random_region, random_card])) {
      result.push([random_region, random_card]);
    }
  }

  return result;
}

export interface CardsFromRegionsOptions {
  cardType: CardType;
  /**
   * Default: UNIFORM
   */
  sampleMode?: SampleMode;
  /**
   * Default: ANY_CARD
   */
  selectionMode?: SelectionMode;
  /**
   * If true, may choose multiple cards from the same region. Otherwise, all
   * cards will be guaranteed to be from different regions.
   *
   * Default: true
   */
  allowSameRegion?: boolean;
  /**
   * The number of cards to randomly choose.
   */
  numCards: number;

  /**
   * The deck that the cards will be potentially added to. Cards which are
   * incompatible with this deck will automatically be filtered out.
   */
  deck: DraftDeck;
  /**
   * A list of cards that will not be chosen.
   *
   * Default: []
   */
  restrictionPool?: Card[];
}

export function randomSampleCards(
  opts: CardsFromRegionsOptions,
  callback: (cards: Status<Card[]>) => void
) {
  const sampleMode = opts.sampleMode ?? SampleMode.UNIFORM;
  const selectionMode = opts.selectionMode ?? SelectionMode.ANY_CARD;
  const allowSameRegion = opts.allowSameRegion ?? true;
  const restrictionPool = opts.restrictionPool ?? [];
  const deck = opts.deck;

  const regionCards = (region_set: RegionSet) => {
    switch (opts.cardType) {
      case CardType.CHAMP:
        return region_set.champs;
      case CardType.NON_CHAMP:
        return region_set.nonChamps;
    }
  };
  const matchesCardType = (card: Card) =>
    isChampion(card) === (opts.cardType === CardType.CHAMP);

  switch (selectionMode) {
    case SelectionMode.FROM_DECK: {
      const cards = deck.cardCounts.filter(
        ({ card }) => matchesCardType(card) && canAddToDeck(deck, card)
      );

      const num_cards = Math.min(opts.numCards, cards.length);
      const chosen_cards =
        randSample(cards, num_cards)?.map((card_count) => card_count.card) ??
        null;
      if (chosen_cards === null) {
        callback(
          makeErrStatus(
            StatusCode.INTERNAL_SERVER_ERROR,
            'you aint got no cards to get'
          )
        );
        return;
      }

      callback(makeOkStatus(chosen_cards));
      return;
    }
    case SelectionMode.ANY_CARD:
    case SelectionMode.NOT_FROM_DECK: {
      regionSets((status) => {
        if (!isOk(status)) {
          callback(status);
          return;
        }
        const region_sets = status.value;

        const region_pool = deck.regions;
        const [total_card_count, cumulative_totals] = region_pool.reduce<
          [number, number[]]
        >(
          ([total_card_count, cumulative_totals], region) => [
            total_card_count + regionCards(region_sets[region]).length,
            cumulative_totals.concat([total_card_count]),
          ],
          [0, []]
        );

        // Ineligible cards are cards that, if chosen, would trigger a re-pick.
        // These must match the conditions checked in the loop below, otherwise it
        // is possible to attempt choosing more cards than possible.
        const ineligible_cards = restrictionPool.concat(
          deck.cardCounts
            .filter(
              ({ card }) =>
                matchesCardType(card) &&
                !canAddToDeck(deck, card) &&
                !restrictionPool.some((res_card) => cardsEqual(res_card, card))
            )
            .map(({ card }) => card)
        );

        const total_eligible_card_count =
          total_card_count -
          region_pool.reduce(
            (count, region) =>
              count +
              arrayCount(ineligible_cards, (card) =>
                regionContains(region, card)
              ),
            0
          );
        // TODO: total_eligible_card_count still double counts eligible
        // multi-region cards, and doesn't account for the draft options. I
        // can't think of an example where this would lead to over
        // estimating the number of cards you can choose, where the true
        // number is less than 4, so for now this edge case is uncovered.

        const cards_to_choose = Math.min(
          opts.numCards,
          total_eligible_card_count
        );

        // List of pairs of [region_idx, set_idx], where region_idx is the index of
        // the region of the card chosen, and set_idx is the index of the card
        // within that region.
        let region_and_set_indexes: [number, number][];
        let cards: Card[] = [];
        let iterations = 0;

        do {
          iterations++;
          if (iterations > MAX_CARD_REPICK_ITERATIONS) {
            callback(
              makeErrStatus(
                StatusCode.MAX_REDRAWS_EXCEEDED,
                'Failed to choose cards after many attempts.'
              )
            );
            return;
          }

          switch (sampleMode) {
            case SampleMode.UNIFORM: {
              const region_and_set_indexes_result = randSampleNumbers(
                total_card_count,
                cards_to_choose
              )?.map((index) => {
                const region_idx = binarySearch(cumulative_totals, index);
                return [region_idx, index - cumulative_totals[region_idx]] as [
                  number,
                  number
                ];
              });

              if (region_and_set_indexes_result === undefined) {
                callback(
                  makeErrStatus(
                    StatusCode.INTERNAL_SERVER_ERROR,
                    'Failed to select champion cards'
                  )
                );
                return;
              }

              region_and_set_indexes = region_and_set_indexes_result;
              break;
            }
            case SampleMode.REGION_WEIGHTED: {
              region_and_set_indexes = sampleCardsByRegion(
                total_card_count,
                cumulative_totals,
                cards_to_choose
              );
              break;
            }
          }

          cards = region_and_set_indexes.map(
            ([region_idx, idx]) =>
              regionCards(region_sets[region_pool[region_idx]])[idx]
          );

          // Normalize multi-region card selection probabilities depending on
          // the card selection mode.
          switch (sampleMode) {
            case SampleMode.UNIFORM: {
              // Each card that is multi-region between the region pool is more
              // likely to be chosen by a factor of how many regions they are
              // in. Normalize this probability by only selecting each card
              // once every N times, where N is the number of regions they are
              // in.
              const norm_factor = cards.reduce(
                (norm_factor, card) =>
                  norm_factor *
                  (1 /
                    arrayCount(region_pool, (region) =>
                      regionContains(region, card)
                    )),
                1
              );
              if (Math.random() > norm_factor) {
                continue;
              }
              break;
            }
            case SampleMode.REGION_WEIGHTED: {
              // For multi-region cards, take a card with 1/region_size / (sum
              // of 1/region_size from region_pool) odds. This will distribute
              // multi-region cards across all the regions they are in,
              // weighting them relatively more heavily in regions which are
              // smaller (so who's cards are more likely to be chosen).
              //
              // A motivating example: consider a card in two regions, one with
              // 2 cards, and another with 100. The cards in region 1 have a
              // 1/4 chance of being chosen, while cards in region 2 have a
              // 1/200 chance of being chosen. If there is a multi-region card
              // in both of those regions, we would want it to be almost as
              // likely to be chosen as the other card in region 1, since it
              // shouldn't be considered a much lesser-probability card by its
              // presence in region 2. By taking this weighted probability, the
              // chance that this multi-region card is chosen is around 24.5%,
              // which is very close to 25%. The multi-region card's presence
              // in the large region hardly dilutes its chance of being chosen.
              // Additionally, this probability approaches 1/4 as the size of
              // the other region approaches infinity.
              const norm_factor = cards
                .map(
                  (card, idx) =>
                    [card, region_and_set_indexes[idx]] as [
                      Card,
                      [number, number]
                    ]
                )
                .reduce((norm_factor, [card, [region_idx, _]]) => {
                  // Find all regions this card matches from the region_pool.
                  const regions = region_pool.filter((region) =>
                    regionContains(region, card)
                  );

                  if (regions.length > 1) {
                    const region_size =
                      region_sets[regions[region_idx]].nonChamps.length;
                    const weighted_sizes = regions.reduce<number>(
                      (sum, region) =>
                        sum + 1 / region_sets[region].nonChamps.length,
                      0
                    );
                    return norm_factor * region_size * weighted_sizes;
                  } else {
                    return norm_factor;
                  }
                }, 1);
              if (Math.random() * norm_factor > 1) {
                continue;
              }
              break;
            }
          }
        } while (
          // If not allow_same_region, check that all cards come from a
          // different region, and if not, redraw.
          (!allowSameRegion &&
            cards_to_choose <= region_pool.length &&
            containsDuplicates(
              region_and_set_indexes,
              (region_and_set_idx) => region_and_set_idx[0]
            )) ||
          // Don't pick ineligible cards.
          cards.some((card) => !formatContainsCard(deck.options, card)) ||
          // Don't choose cards from the deck if the options forbid it.
          (selectionMode === SelectionMode.NOT_FROM_DECK &&
            cards.some((card) => deckContainsCard(deck, card))) ||
          // It is possible for multi-region cards to be selected multiple times.
          containsDuplicates(cards, (card) => {
            return card.cardCode;
          }) ||
          // Verify that all champs are legal in the deck, and are not part of the
          // restriction pool.
          //
          // It may be that certain pairs of champions are incompatible in the deck,
          // but the champions individually are each compatible. This will be
          // checked for when validating 'choose_cards' calls.
          cards.some((card) => {
            return !canAddToDeck(deck, card) || restrictionPool.includes(card);
          })
        );

        callback(makeOkStatus(cards));
      });
    }
  }
}
