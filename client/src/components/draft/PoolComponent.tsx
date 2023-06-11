import React from 'react'

import { Card } from 'common/game/card'
import { DraftStateInfo, draftStateCardLimits } from 'common/game/draft'
import { LoRDraftClientSocket, SessionCred } from 'common/game/socket-msgs'
import { Status, isOk } from 'common/util/status'

import { Button } from 'client/components/common/button'
import { CardComponent } from 'client/components/draft/CardComponent'

export interface PoolComponentProps {
  socket: LoRDraftClientSocket
  authInfo: SessionCred
  refreshDraft: (
    session_cred: SessionCred,
    callback: (status: Status) => void
  ) => void
  closeDraft: () => void
  draftState: DraftStateInfo
  setDraftState: (draft_state: DraftStateInfo | null) => void
}

export function PoolComponent(props: PoolComponentProps) {
  const [selected, setSelected] = React.useState<string[]>([])
  const setSelectedRef = React.useRef<typeof setSelected>(setSelected)
  const authInfoRef = React.useRef<SessionCred>(props.authInfo)

  const cards: (Card | null)[] = props.draftState.pending_cards

  const refreshDraftRef = React.useRef<typeof props.refreshDraft>(
    () => undefined
  )
  const setDraftStateRef = React.useRef<typeof props.setDraftState>(
    () => undefined
  )

  refreshDraftRef.current = props.refreshDraft
  setDraftStateRef.current = props.setDraftState
  setSelectedRef.current = setSelected
  authInfoRef.current = props.authInfo

  function confirm() {
    const revertedCards = selected.map(
      (cardCode) =>
        cards.find(
          (card) => card !== null && card.cardCode === cardCode
        ) as Card
    )
    chooseCards(revertedCards)
  }

  function chooseCards(revertedCards: Card[]) {
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

    props.socket.call(
      'choose_cards',
      authInfoRef.current,
      revertedCards,
      (status) => {
        if (!isOk(status)) {
          console.log(status)
          return
        }

        setSelectedRef.current([])
        setDraftStateRef.current(status.value)
      }
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
      <Button onClick={props.closeDraft}>EXIT!</Button>
    </div>
  )
}
