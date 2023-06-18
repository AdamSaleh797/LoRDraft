import React from 'react'

import { Card, cardComparator as cardsEq } from 'common/game/card'
import {
  DraftState,
  DraftStateInfo,
  canAddToDeck,
  draftStateCardLimits,
} from 'common/game/draft'
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs'

import { Button } from 'client/components/common/button'
import { CardComponent } from 'client/components/draft/Card'
import { DraftSketchManager } from 'client/context/draft/draft_sketch_manager'
import { doChooseDraftCardsAsync, doExitDraftAsync } from 'client/store/draft'
import { useLoRDispatch } from 'client/store/hooks'

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
  const dispatch = useLoRDispatch()

  const cards = props.draftState.pendingCards
  const selected_cards = props.draftSketchManager.sketch().addedCards

  function confirm() {
    const revertedCards = selected_cards.map(
      (chosen_card) =>
        cards.find((card) => cardsEq(card, chosen_card)) ?? (undefined as never)
    )
    chooseCards(revertedCards)
  }

  async function chooseCards(revertedCards: Card[]) {
    const min_max = draftStateCardLimits(props.draftState.state)
    if (min_max === null) {
      return
    }

    if (
      min_max[0] > revertedCards.length &&
      min_max[1] < revertedCards.length
    ) {
      return
    }

    dispatch(
      doChooseDraftCardsAsync({
        socket: props.socket,
        authInfo: props.authInfo,
        cards: revertedCards,
      })
    )
  }

  function exitDraft() {
    dispatch(
      doExitDraftAsync({
        socket: props.socket,
        authInfo: props.authInfo,
      })
    )
  }

  return (
    <div>
      {cards.map((card, index) => {
        const is_selected = selected_cards.some((selected_card) =>
          cardsEq(selected_card, card)
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
          />
        )
      })}
      <Button onClick={confirm}>CONFIRM!</Button>
      <Button onClick={exitDraft}>EXIT!</Button>
    </div>
  )
}
