import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

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
import { DraftStateInfo } from 'draft'

function createLoRSocket(): LoRDraftClientSocket {
  return new AsyncSocketContext(io() as LoRDraftClientSocketIO)
}

function Main() {
  const [draftState, setDraftState] = React.useState<DraftStateInfo | null>(
    null
  )
  const socket_ref = React.useRef(createLoRSocket())
  const draftStateRef = React.useRef<DraftStateInfo | null>(draftState)
  const setDraftStateRef = React.useRef<typeof setDraftState>(() => undefined)

  draftStateRef.current = draftState
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

  const updateDraftState = (
    mutator: (draft_state: DraftStateInfo | null) => DraftStateInfo | null
  ) => {
    setDraftStateRef.current(mutator(draftStateRef.current))
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
          updateDraftState={updateDraftState}
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
