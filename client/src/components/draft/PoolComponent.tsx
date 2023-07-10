import React from 'react'

import style from './PoolComponent.module.css'

import { Card, cardsEqual } from 'common/game/card'
import {
  DraftState,
  DraftStateInfo,
  canAddToDeck,
  draftStateCardLimits,
} from 'common/game/draft'
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs'

import { CardComponent } from 'client/components/draft/Card'
import { DraftSketchManager } from 'client/context/draft/draft_sketch_manager'

/**
 * Before selecting the card, will unselect as many cards as necessary from the
 * draft sketch until card can be selected without going over the state's card
 * limit or the card conflicting with other selected cards.
 */
function smartSelect(
  draft_sketch_manager: DraftSketchManager,
  card: Card,
  draft_state: DraftState,
  is_selected: boolean
) {
  if (is_selected) {
    draft_sketch_manager.removeCard(card)
  } else {
    const min_max = draftStateCardLimits(draft_state)
    if (min_max === null) {
      return
    }

    let sketch = draft_sketch_manager.sketch()
    const cards_to_remove = []

    // If the round max number of cards have already been chosen, remove
    // the least-recently-added card, continue to do so while the card
    // selected is incompatible with the deck.
    while (
      sketch.addedCards.length >= min_max[1] ||
      (sketch.addedCards.length > 0 && !canAddToDeck(sketch.deck, card))
    ) {
      cards_to_remove.push(sketch.addedCards[0])
      sketch = sketch.removeCardFromSketch(sketch.addedCards[0])
    }

    draft_sketch_manager.removeCards(cards_to_remove)
    draft_sketch_manager.addCard(card)
  }
}

export interface PoolComponentProps {
  socket: LoRDraftClientSocket
  authInfo: AuthInfo
  draftState: DraftStateInfo
  draftSketchManager: DraftSketchManager
}

export function PoolComponent(props: PoolComponentProps) {
  const cards = props.draftState.pendingCards
  const selected_cards = props.draftSketchManager.sketch().addedCards

  return (
    <div className={style.poolComponent}>
      <div className={style.cardContainer}>
        {cards.map((card, index) => {
          const is_selected = selected_cards.some((selected_card) =>
            cardsEqual(selected_card, card)
          )

          const doSelect = () => {
            smartSelect(
              props.draftSketchManager,
              card,
              props.draftState.state,
              is_selected
            )
          }
          return (
            <CardComponent
              key={`${index}${card.cardCode}`}
              card={card}
              numCards={cards.length}
              isSelected={is_selected}
              select={doSelect}
              draftState={props.draftState}
            />
          )
        })}
      </div>
    </div>
  )
}
