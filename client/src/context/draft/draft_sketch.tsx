import { Card, cardsEqual } from 'common/game/card';
import { DraftDeck, copyDraftDeck } from 'common/game/draft';
import { addCardToDeck } from 'common/game/draft';

/**
 * The draft sketch is a representation of the current draft with pending cards
 * added to it. It is meant to manage the smart selection logic when choosing
 * cards from the pool of available cards.
 */
export class DraftSketch {
  /**
   * The sketch deck, which reflects the current deck with `addedCards`
   * inserted.
   */
  readonly deck: DraftDeck;

  /**
   * A reference to the original `DraftDeck` that this sketch is based off of.
   */
  readonly originalDeck: DraftDeck;

  /**
   * A list of cards that have been added to this draft deck.
   */
  readonly addedCards: readonly Card[];

  constructor(
    deck: DraftDeck,
    originalDeck: DraftDeck = deck,
    addedCards: readonly Card[] = []
  ) {
    this.deck = deck;
    this.originalDeck = originalDeck;
    this.addedCards = addedCards;
  }

  addCardToSketch(card: Card): DraftSketch {
    const deck = copyDraftDeck(this.deck);
    if (addCardToDeck(deck, card)) {
      return new DraftSketch(
        deck,
        this.originalDeck,
        this.addedCards.concat([card])
      );
    } else {
      return this;
    }
  }

  /**
   * Removes a card from the draft sketch, returning the new DraftSketch object
   * that was constructed with the card removed. Will return `this` if the card
   * did not exist in the sketch.
   */
  removeCardFromSketch(card: Card): DraftSketch {
    const idx = this.addedCards.findIndex((added_card) =>
      cardsEqual(card, added_card)
    );
    if (idx === -1) {
      return this;
    }

    const added_cards = this.addedCards.slice();
    added_cards.splice(idx, 1);

    // Copy the deck and re-insert all remaining added cards.
    const deck = copyDraftDeck(this.originalDeck);
    if (
      added_cards.some((card) => {
        // If any card can't be added for some reason, terminate the loop
        // early.
        return !addCardToDeck(deck, card);
      })
    ) {
      // Reset the draft sketch. This should never happen, since addedCards
      // have already been verified to fit in the deck, so any subset of them
      // should also fit. But keep this as a failsafe.
      return new DraftSketch(this.originalDeck);
    }

    return new DraftSketch(deck, this.originalDeck, added_cards);
  }

  /**
   * Removes a set of cards from the draft sketch, returning the new DraftSketch
   * object that was constructed with the card removed. Will ignore cards which
   * aren't in the draft but were in `cards`.
   */
  removeCardsFromSketch(cards: Card[]): DraftSketch {
    const remaining = this.addedCards.filter(
      (card) => cards.find((c) => cardsEqual(card, c)) === undefined
    );

    // Copy the deck and re-insert all remaining added cards.
    const deck = copyDraftDeck(this.originalDeck);
    if (
      remaining.some((card) => {
        // If any card can't be added for some reason, terminate the loop
        // early.
        return !addCardToDeck(deck, card);
      })
    ) {
      // Reset the draft sketch. This should never happen, since addedCards
      // have already been verified to fit in the deck, so any subset of them
      // should also fit. But keep this as a failsafe.
      return new DraftSketch(this.originalDeck);
    }

    return new DraftSketch(deck, this.originalDeck, remaining);
  }
}
