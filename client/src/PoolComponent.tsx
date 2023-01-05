import React from 'react'
import { Card } from 'card'
import { POOL_SIZE } from 'draft'
import { LoRDraftClientSocket, SessionCred } from 'socket-msgs'
import { getStorageAuthInfo } from './auth_session'
import { isOk } from 'lor_util'
import { CardComponent } from './CardComponent'

export interface PoolComponentProps {
  socket: LoRDraftClientSocket
  recordCard: (card: Card) => void
}

export function PoolComponent(props: PoolComponentProps) {
  const [cards, setCards] = React.useState<(Card | null)[]>(
    new Array(POOL_SIZE).fill(null)
  )

  const setCardsRef = React.useRef<(cards: (Card | null)[]) => void>(
    () => undefined
  )

  setCardsRef.current = setCards

  function getInitialPool(auth_info: SessionCred) {
    props.socket.call('initial_selection', auth_info, (status, champs) => {
      if (!isOk(status) || champs === null) {
        console.log(status)
        return
      }
      setCardsRef.current(
        champs.concat(new Array(POOL_SIZE - champs.length).fill(null))
      )
    })
  }

  function joinDraft() {
    const auth_info = getStorageAuthInfo()
    if (auth_info !== null) {
      props.socket.call('join_draft', auth_info, (status) => {
        if (!isOk(status)) {
          console.log(status)
          return
        }
        getInitialPool(auth_info)
      })
    }
  }

  return (
    <div onClick={joinDraft}>
      {cards.map((card) => {
        return (
          <CardComponent
            card={card}
            recordCard={props.recordCard}
            numCards={cards.length}
          />
        )
      })}
      <button onClick={joinDraft}>DRAFT!</button>
    </div>
  )
}
