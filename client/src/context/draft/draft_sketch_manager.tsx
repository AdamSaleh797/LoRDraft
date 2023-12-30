import { Card } from 'common/game/card';

import { DraftSketch } from 'client/context/draft/draft_sketch';

export class DraftSketchManager {
  private sketch_: DraftSketch;
  private readonly update_callback_: (sketch: DraftSketch) => void;

  constructor(
    sketch: DraftSketch,
    updateCallback: (sketch: DraftSketch) => void
  ) {
    this.sketch_ = sketch;
    this.update_callback_ = updateCallback;
  }

  sketch(): DraftSketch {
    return this.sketch_;
  }

  addCard(card: Card) {
    this.sketch_ = this.sketch_.addCardToSketch(card);
    this.update_callback_(this.sketch_);
  }

  removeCard(card: Card) {
    this.sketch_ = this.sketch_.removeCardFromSketch(card);
    this.update_callback_(this.sketch_);
  }

  removeCards(cards: Card[]) {
    this.sketch_ = this.sketch_.removeCardsFromSketch(cards);
    this.update_callback_(this.sketch_);
  }
}
