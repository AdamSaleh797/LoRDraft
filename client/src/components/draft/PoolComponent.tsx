import { Button } from 'client/components/button'

import React from 'react'

import { Card } from 'game/card'
import {
  DraftStateInfo,
  addCardsToDeck,
  draftStateCardLimits,
  makeDraftDeck,
  POOL_SIZE,
} from 'game/draft'
import { Status, isOk } from 'util/status'

import { LoRDraftClientSocket, SessionCred } from 'game/socket-msgs'

import { CardComponent } from 'client/components/draft/CardComponent'

export interface PoolComponentProps {
  socket: LoRDraftClientSocket
  authInfo: SessionCred
  refreshDraft: (
    session_cred: SessionCred,
    callback: (status: Status) => void
  ) => void
  closeDraft: () => void
  draftState: DraftStateInfo | null
  updateDraftState: (
    mutator: (draft_state: DraftStateInfo | null) => DraftStateInfo | null
  ) => void
}

export function PoolComponent(props: PoolComponentProps) {
  const [selected, setSelected] = React.useState<string[]>([])
  const setSelectedRef = React.useRef<typeof setSelected>(setSelected)
  const authInfoRef = React.useRef<SessionCred>(props.authInfo)

  const cards: (Card | null)[] =
    props.draftState?.pending_cards ?? new Array(POOL_SIZE).fill(null)

  const refreshDraftRef = React.useRef<typeof props.refreshDraft>(
    () => undefined
  )
  const updateDraftStateRef = React.useRef<typeof props.updateDraftState>(
    () => undefined
  )

  refreshDraftRef.current = props.refreshDraft
  updateDraftStateRef.current = props.updateDraftState
  setSelectedRef.current = setSelected
  authInfoRef.current = props.authInfo

  function nextPool() {
    props.socket.call('next_pool', authInfoRef.current, (status) => {
      if (!isOk(status)) {
        console.log(status)
        return
      }
      const [pending_cards, draft_state] = status.value

      updateDraftStateRef.current((draft_state_info) => {
        return {
          state: draft_state,
          deck:
            draft_state_info === null
              ? makeDraftDeck(0 as any)
              : draft_state_info.deck,
          pending_cards: pending_cards,
        }
      })

      // Clear the selected cards.
      setSelectedRef.current([])
    })
  }

  React.useEffect(() => {
    nextPool()
  }, [])

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
    if (props.draftState === null) {
      return
    }

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
      (status: Status) => {
        if (!isOk(status)) {
          console.log(status)
          return
        }
        updateDraftStateRef.current((draft_state_info) => {
          if (draft_state_info === null) {
            // This should not happen.
            return null
          }
          draft_state_info = { ...draft_state_info }
          addCardsToDeck(draft_state_info.deck, revertedCards)
          return draft_state_info
        })
        nextPool()
      }
    )
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
      <Button onClick={confirm}>CONFIRM!</Button>
      <Button onClick={props.closeDraft}>EXIT!</Button>
    </div>
  )
}
