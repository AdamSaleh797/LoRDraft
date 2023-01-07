import React from 'react'
import { Card } from 'card'
import { draftStateCardLimits, DraftStateInfo, POOL_SIZE } from 'draft'
import { LoRDraftClientSocket, SessionCred } from 'socket-msgs'
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
  const [selected, setSelected] = React.useState<string[]>([])
  const [min_max, setMinMax] = React.useState<[number, number]>([0, 0])

  const cards: (Card | null)[] =
    props.draftState?.pending_cards ?? new Array(POOL_SIZE).fill(null)

  const setPendingCardsRef = React.useRef<typeof props.setPendingCards>(
    () => undefined
  )
  const setMinMaxRef = React.useRef<typeof setMinMax>(() => undefined)

  setMinMaxRef.current = setMinMax
  setPendingCardsRef.current = props.setPendingCards

  function getInitialPool(auth_info: SessionCred) {
    props.socket.call('next_pool', auth_info, (status, champs, draft_state) => {
      if (draft_state !== null) {
        setMinMaxRef.current(draftStateCardLimits(draft_state) ?? [0, 0])
      }
      if (!isOk(status) || champs === null) {
        console.log(status)
        return
      }
      setPendingCardsRef.current(champs)
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
    transitionSocketCalls(revertedCards)
  }

  function transitionSocketCalls(revertedCards: Card[]) {
    setSelected([])
    props.setPendingCards([])

    const auth_info = getStorageAuthInfo()
    if (auth_info === null) {
      return
    }

    console.log(min_max, revertedCards.length)

    if (
      min_max[0] > revertedCards.length &&
      min_max[1] < revertedCards.length
    ) {
      return
    }

    props.socket.call(
      'choose_cards',
      auth_info,
      revertedCards,
      (status: Status) => {
        if (!isOk(status)) {
          console.log(status)
          return
        }
        props.addToDeck(revertedCards)
        socketPoolCall(auth_info)
      }
    )
  }

  function socketPoolCall(auth_info: SessionCred) {
    props.socket.call('next_pool', auth_info, (status, cards, draft_state) => {
      if (draft_state !== null) {
        setMinMaxRef.current(draftStateCardLimits(draft_state) ?? [0, 0])
      }
      if (!isOk(status) || cards === null) {
        console.log(status)
        return
      }
      setPendingCardsRef.current(cards)
    })
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
