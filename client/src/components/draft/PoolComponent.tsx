import React from 'react'

import { Card } from 'common/game/card'
import { DraftStateInfo, draftStateCardLimits } from 'common/game/draft'
import { LoRDraftClientSocket, SessionCred } from 'common/game/socket-msgs'
import { isOk } from 'common/util/status'

import { Button } from 'client/components/common/button'
import { CardComponent } from 'client/components/draft/Card'
import { doChooseDraftCardsAsync, doExitDraftAsync } from 'client/store/draft'
import { useLoRDispatch } from 'client/store/hooks'

export interface PoolComponentProps {
  socket: LoRDraftClientSocket
  authInfo: SessionCred
  draftState: DraftStateInfo
}

export function PoolComponent(props: PoolComponentProps) {
  const [selected, setSelected] = React.useState<string[]>([])
  const setSelectedRef = React.useRef<typeof setSelected>(setSelected)
  const dispatch = useLoRDispatch()

  const cards: (Card | null)[] = props.draftState.pending_cards

  setSelectedRef.current = setSelected

  function confirm() {
    const revertedCards = selected.map(
      (cardCode) =>
        cards.find(
          (card) => card !== null && card.cardCode === cardCode
        ) as Card
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
        auth_info: props.authInfo,
        cards: revertedCards,
      })
    )

    // If the cards were successfully chosen, then reset the selected cards.
    if (
      choose_cards_action.payload !== undefined &&
      isOk(choose_cards_action.payload)
    ) {
      setSelectedRef.current([])
    }
  }

  function exitDraft() {
    dispatch(
      doExitDraftAsync({
        socket: props.socket,
        auth_info: props.authInfo,
      })
    )
  }

  return (
    <div>
      {cards.map((card, index) => {
        function select() {
          if (card === null) {
            return
          }
          selected.includes(card.cardCode)
            ? setSelected(
                selected.filter((cardCode) => cardCode !== card.cardCode)
              )
            : setSelected(selected.concat(card.cardCode))
        }

        return (
          <CardComponent
            key={`${index}${card?.cardCode ?? ''}`}
            card={card}
            numCards={cards.length}
            isSelected={
              card !== null && selected.includes(card.cardCode) ? true : false
            }
            select={select}
          />
        )
      })}
      <Button onClick={confirm}>CONFIRM!</Button>
      <Button onClick={exitDraft}>EXIT!</Button>
    </div>
  )
}
