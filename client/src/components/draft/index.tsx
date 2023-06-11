import React from 'react'
import io from 'socket.io-client'

import { DraftStateInfo } from 'game/draft'
import { GameMetadata } from 'game/metadata'
import {
  LoRDraftClientSocket,
  LoRDraftClientSocketIO,
  SessionCred,
} from 'game/socket-msgs'
import { AsyncSocketContext } from 'util/async_socket'
import { OkStatus, Status, StatusCode, isOk, makeErrStatus } from 'util/status'

import { SessionComponent } from 'client/components/auth/auth_session'
import { CachedAuthInfo } from 'client/components/auth/cached_auth_info'
import { DeckList } from 'client/components/draft/DeckList'
import { ManaCurve } from 'client/components/draft/ManaCurve'
import { TypeCounts } from 'client/components/draft/TypeCounts'
import { DraftFlowComponent } from 'client/components/draft/draft_flow'
import 'client/styles/global_styles.css'

function createLoRSocket(): LoRDraftClientSocket {
  return new AsyncSocketContext(io() as LoRDraftClientSocketIO)
}

let g_inflight = false

function getGameMetadata(
  socket: LoRDraftClientSocket,
  session_cred: SessionCred,
  callback: (game_metadata: Status<GameMetadata>) => void
) {
  if (g_inflight) {
    callback(makeErrStatus(StatusCode.THROTTLE, 'Message already in-flight'))
    return
  }

  g_inflight = true
  socket.call('game_metadata', session_cred, (game_metadata) => {
    g_inflight = false
    callback(game_metadata)
  })
}

export function Draft() {
  const [draftState, setDraftState] = React.useState<DraftStateInfo | null>(
    null
  )
  const [cachedAuthInfo, setCachedAuthInfo] = React.useState<CachedAuthInfo>(
    CachedAuthInfo.initialStorageAuthInfo()
  )

  const socket_ref = React.useRef(createLoRSocket())
  const gameMetadataRef = React.useRef<GameMetadata | null>(null)
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
    socket.call('current_draft', session_cred, (status) => {
      if (!isOk(status)) {
        callback(status)
        return
      }
      const draft_state_info = status.value
      setDraftStateRef.current(draft_state_info)
      callback(OkStatus)
    })
  }

  const authInfo = cachedAuthInfo.getStorageAuthInfo()
  const setAuthInfo = (authInfo: SessionCred) => {
    setCachedAuthInfoRef.current(CachedAuthInfo.setStorageAuthInfo(authInfo))
  }
  const clearAuthInfo = () => {
    setCachedAuthInfoRef.current(CachedAuthInfo.clearStorageAuthInfo())
  }

  if (authInfo !== null && gameMetadataRef.current === null) {
    getGameMetadata(socket_ref.current, authInfo, (status) => {
      if (isOk(status)) {
        gameMetadataRef.current = status.value
      }
    })
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
            setDraftState={setDraftState}
            gameMetadata={gameMetadataRef.current}
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
        <DeckList
          draftState={draftState}
          gameMetadata={gameMetadataRef.current}
        />
      </div>
    </div>
  )
}
