import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'
import {
  DraftStateInfo,
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

function createLoRSocket(): LoRDraftClientSocket {
  return new AsyncSocketContext(io() as LoRDraftClientSocketIO)
}

function Main() {
  const [draftState, setDraftState] = React.useState<DraftStateInfo | null>(
    null
  )
  const socket_ref = React.useRef(createLoRSocket())

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
      setDraftState(draft_state_info)
      callback(status)
    })
  }

  const addToDeck = (cards: Card[]) => {
    if (draftState !== null) {
      const newDraftState = { ...draftState }
      newDraftState.deck.cards.push(...cards)
      setDraftState(newDraftState)
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
        deck: {
          regions: [],
          cards: [],
        },
        pending_cards: cards,
      }
      setDraftState(newDraftState)
    }
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
      <div>
        <ManaCurve draftState={draftState} />
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
