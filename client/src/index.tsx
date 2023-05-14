import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'
import {
  LoRDraftClientSocket,
  LoRDraftClientSocketIO,
  SessionCred,
} from 'socket-msgs'
import { AsyncSocketContext } from 'async_socket'
import { SessionComponent } from './auth_session'
import { PoolComponent } from './PoolComponent'
import { ManaCurve } from './ManaCurve'
import { DeckList } from './DeckList'
import { isOk, Status } from 'lor_util'
import { addCardToDeck, DraftStateInfo, makeDraftDeck } from 'draft'
import { TypeCounts } from './TypeCounts'

function createLoRSocket(): LoRDraftClientSocket {
  return new AsyncSocketContext(io() as LoRDraftClientSocketIO)
}

function Main() {
  const [draftState, setDraftState] = React.useState<DraftStateInfo | null>(
    null
  )
  const socket_ref = React.useRef(createLoRSocket())
  const setDraftStateRef = React.useRef<typeof setDraftState>(() => undefined)

  setDraftStateRef.current = setDraftState

  const socket = socket_ref.current

  const refreshDraft = (
    session_cred: SessionCred,
    callback: (status: Status) => void
  ) => {
    socket.call('current_draft', session_cred, (status, draft_state_info) => {
      if (!isOk(status) || draft_state_info === null) {
        callback(status)
        return
      }

      setDraftStateRef.current(draft_state_info)
      callback(status)
    })
  }

  const addToDeck = (cards: Card[]): boolean => {
    if (draftState !== null) {
      const newDraftState = { ...draftState }

      // Fail if any of the cards can't be added to the deck.
      if (
        cards.some((card) => {
          return !addCardToDeck(newDraftState.deck, card)
        })
      ) {
        return false
      }

      setDraftState(newDraftState)
      return true
    } else {
      return false
    }
  }

  const setPendingCards = (cards: Card[]) => {
    if (draftState !== null) {
      const newDraftState = { ...draftState }
      newDraftState.pending_cards = cards
      setDraftState(newDraftState)
      console.log('test y')
    } else {
      const newDraftState: DraftStateInfo = {
        deck: makeDraftDeck(),
        pending_cards: cards,
      }
      setDraftState(newDraftState)
    }
  }

  const deckInfoDisplay = {
    width: 'calc(50% - 10px)',
    display: 'inline-block',
    marginLeft: '5px',
    marginRight: '5px',
  }

  return (
    <div>
      <div>
        <SessionComponent socket={socket} />
      </div>
      <div>
        <PoolComponent
          socket={socket}
          refreshDraft={refreshDraft}
          draftState={draftState}
          addToDeck={addToDeck}
          setPendingCards={setPendingCards}
        />
      </div>
      <div style={deckInfoDisplay}>
        <ManaCurve draftState={draftState} />
      </div>
      <div style={deckInfoDisplay}>
        <TypeCounts draftState={draftState} />
      </div>
      <div>
        <DeckList draftState={draftState} />
      </div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <div style={{ width: '976px', marginLeft: 'calc(50vw - 8px - 976px/2)' }}>
    <Main />
  </div>
)
