import { Card, cardComparator } from 'common/game/card'
import { DraftDeck, copyDraftDeck } from 'common/game/draft'
import { addCardToDeck } from 'common/game/draft'

export class DraftSketch {
  /**
   * The sketch deck, which reflects the current deck with `addedCards`
   * inserted.
   */
  deck: DraftDeck

  /**
   * A reference to the original `DraftDeck` that this sketch is based off of.
   */
  readonly originalDeck: DraftDeck

  /**
   * A list of cards that have been added to this draft deck.
   */
  addedCards: Card[]

  constructor(deck: DraftDeck) {
    this.deck = deck
    this.originalDeck = deck
    this.addedCards = []
  }

  addCardToSketch(card: Card) {
    if (addCardToDeck(this.deck, card)) {
      this.addedCards.push(card)
    }
  }

  /**
   * Removes a card from the draft sketch, returning true if the card was able to
   * be removed.
   */
  removeCardFromSketch(card: Card): boolean {
    const idx = this.addedCards.findIndex((added_card) =>
      cardComparator(card, added_card)
    )
    if (idx === -1) {
      return false
    }

    const added_cards = this.addedCards.slice()
    added_cards.splice(idx, 1)

    // Copy the deck and re-insert all remaining added cards.
    const deck = copyDraftDeck(this.originalDeck)
    if (
      added_cards.some((card) => {
        // If any card can't be added for some reason, terminate the loop
        // early.
        return !addCardToDeck(deck, card)
      })
    ) {
      // Reset the draft sketch. This should never happen, since addedCards
      // have already been verified to fit in the deck, so any subset of them
      // should also fit. But keep this as a failsafe.
      this.addedCards = []
      this.deck = this.originalDeck
      return true
    }

    this.addedCards = added_cards
    this.deck = deck
    return true
  }
}
