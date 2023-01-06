import React from 'react'
import { Card } from 'card'
import { POOL_SIZE } from 'draft'
import { DraftStateInfo, LoRDraftClientSocket, SessionCred } from 'socket-msgs'
import { getStorageAuthInfo } from './auth_session'
import { isOk, Status } from 'lor_util'
import { CardComponent } from './CardComponent'
import { createReadStream } from 'fs'

export interface PoolComponentProps {
  socket: LoRDraftClientSocket
  refreshDraft: (
    session_cred: SessionCred,
    callback: (status: Status) => void
  ) => void
  draftState: DraftStateInfo | null
  addToDeck: (cards: Card[]) => void
  setPendingCards: (cards: Card[]) => void
}

export function PoolComponent(props: PoolComponentProps) {
  const [selected, setSelected] = React.useState<string[]>([])

  const cards: (Card | null)[] =
    props.draftState?.pending_cards ?? new Array(POOL_SIZE).fill(null)

  const setPendingCardsRef = React.useRef<typeof props.setPendingCards>(
    () => undefined
  )
  setPendingCardsRef.current = props.setPendingCards

  function getInitialPool(auth_info: SessionCred) {
    props.socket.call('initial_selection', auth_info, (status, champs) => {
      if (!isOk(status) || champs === null) {
        console.log(status)
        return
      }
      setPendingCardsRef.current(champs)
      console.log('grabink')
      console.log(champs)
    })
  }

  function joinDraft() {
    const auth_info = getStorageAuthInfo()
    if (auth_info !== null) {
      props.socket.call('join_draft', auth_info, (status) => {
        if (!isOk(status)) {
          return status
        }
        getInitialPool(auth_info)
      })
    }
  }

  function confirm() {
    const revertedCards = selected.map(
      (cardCode) =>
        cards.find(
          (card) => card !== null && card.cardCode === cardCode
        ) as Card
    )

    props.setPendingCards([])
    props.addToDeck(revertedCards)
  }

  return (
    <div>
      {cards.map((card) => {
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

        console.log(card?.cardCode)
        return (
          <CardComponent
            card={card}
            numCards={cards.length}
            isSelected={
              card !== null && selected.includes(card.cardCode) ? true : false
            }
            select={select}
          />
        )
      })}
      <button onClick={confirm}>CONFIRM!</button>
      <button onClick={joinDraft}>DRAFT!</button>
    </div>
  )
}
