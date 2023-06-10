import React from 'react'
import io from 'socket.io-client'

import {
  LoRDraftClientSocket,
  LoRDraftClientSocketIO,
  SessionCred,
} from 'socket-msgs'
import { AsyncSocketContext } from 'async_socket'
import { SessionComponent } from '../auth/auth_session'
import { ManaCurve } from './ManaCurve'
import { DeckList } from './DeckList'
import { isOk, Status } from 'lor_util'
import { DraftStateInfo } from 'draft'
import { CachedAuthInfo } from '../auth/cached_auth_info'
import { TypeCounts } from './TypeCounts'
import { DraftFlowComponent } from './draft_flow'

function createLoRSocket(): LoRDraftClientSocket {
  return new AsyncSocketContext(io() as LoRDraftClientSocketIO)
}

export function Draft() {
  const [draftState, setDraftState] = React.useState<DraftStateInfo | null>(
    null
  )
  const [cachedAuthInfo, setCachedAuthInfo] = React.useState<CachedAuthInfo>(
    CachedAuthInfo.initialStorageAuthInfo()
  )

  const socket_ref = React.useRef(createLoRSocket())
  const draftStateRef = React.useRef<DraftStateInfo | null>(draftState)
  const setDraftStateRef = React.useRef<typeof setDraftState>(() => undefined)
  const setCachedAuthInfoRef =
    React.useRef<typeof setCachedAuthInfo>(setCachedAuthInfo)

  draftStateRef.current = draftState
  setDraftStateRef.current = setDraftState
  setCachedAuthInfoRef.current = setCachedAuthInfo

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

  const authInfo = cachedAuthInfo.getStorageAuthInfo()
  const setAuthInfo = (authInfo: SessionCred) => {
    setCachedAuthInfoRef.current(CachedAuthInfo.setStorageAuthInfo(authInfo))
  }
  const clearAuthInfo = () => {
    setCachedAuthInfoRef.current(CachedAuthInfo.clearStorageAuthInfo())
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
        <SessionComponent
          socket={socket}
          authInfo={authInfo}
          setAuthInfo={setAuthInfo}
          clearAuthInfo={clearAuthInfo}
          refreshDraft={refreshDraft}
        />
      </div>
      <div>
        {authInfo === null ? (
          []
        ) : (
          <DraftFlowComponent
            socket={socket}
            authInfo={authInfo}
            refreshDraft={refreshDraft}
            draftState={draftState}
            updateDraftState={updateDraftState}
          />
        )}
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