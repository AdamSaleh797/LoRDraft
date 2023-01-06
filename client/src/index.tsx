import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'
import {
  DraftDeck,
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
  const [deck, setDeck] = React.useState<DraftDeck | null>(null)
  const socket_ref = React.useRef(createLoRSocket())

  const socket = socket_ref.current

  const refreshDraft = (
    session_cred: SessionCred,
    callback: (status: Status) => void
  ) => {
    socket.call('current_draft', session_cred, (status, draft_deck) => {
      if (!isOk(status) || draft_deck === null) {
        callback(status)
        return
      }
      setDeck(draft_deck)
      callback(status)
    })
  }

  return (
    <div>
      <div>
        <SessionComponent socket={socket} />
      </div>
      <div>
        <PoolComponent socket={socket} refreshDraft={refreshDraft} />
      </div>
      <div>
        <ManaCurve deck={deck} />
      </div>
      <div>
        <DeckList deck={deck} />
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
