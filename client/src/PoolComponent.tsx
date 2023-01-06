import React from 'react'
import { Card } from 'card'
import { POOL_SIZE } from 'draft'
import { DraftStateInfo, LoRDraftClientSocket, SessionCred } from 'socket-msgs'
import { getStorageAuthInfo } from './auth_session'
import { isOk, Status } from 'lor_util'
import { CardComponent } from './CardComponent'

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
  console.log('uber pooly')
  console.log(props.draftState?.pending_cards)
  const cards: Card[] =
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

  function select() {}

  return (
    <div>
      {cards.map((card) => {
        return (
          <CardComponent
            card={card}
            numCards={cards.length}
            addToDeck={props.addToDeck}
            isSelected={false}
            select={select}
          />
        )
      })}
      <button onClick={joinDraft}>DRAFT!</button>
    </div>
  )
}
