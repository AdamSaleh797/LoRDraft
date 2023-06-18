import React from 'react'

import { Card, cardComparator as cardsEq } from 'common/game/card'
import { DraftStateInfo, draftStateCardLimits } from 'common/game/draft'
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs'
import { isOk } from 'common/util/status'

import { Button } from 'client/components/common/button'
import { CardComponent } from 'client/components/draft/Card'
import { DraftSketchManager } from 'client/context/draft/draft_sketch_manager'
import { doChooseDraftCardsAsync, doExitDraftAsync } from 'client/store/draft'
import { useLoRDispatch } from 'client/store/hooks'

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

    const choose_cards_action = await dispatch(
      doChooseDraftCardsAsync({
        socket: props.socket,
        authInfo: props.authInfo,
        cards: revertedCards,
      })
    )

    // If the cards were successfully chosen, then reset the selected cards.
    if (
      choose_cards_action.payload !== undefined &&
      isOk(choose_cards_action.payload)
    ) {
      // setSelectedRef.current([])
    }
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

        function select() {
          if (is_selected) {
            props.draftSketchManager.removeCard(card)
          } else {
            props.draftSketchManager.addCard(card)
          }
        }

        return (
          <CardComponent
            key={`${index}${card.cardCode}`}
            card={card}
            numCards={cards.length}
            isSelected={is_selected}
            select={select}
          />
        )
      })}
      <Button onClick={confirm}>CONFIRM!</Button>
      <Button onClick={exitDraft}>EXIT!</Button>
    </div>
  )
}
