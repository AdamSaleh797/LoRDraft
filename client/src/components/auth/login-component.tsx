import React from 'react'
import io from 'socket.io-client'

import { DraftStateInfo } from 'common/game/draft'
import {
  LoRDraftClientSocket,
  LoRDraftClientSocketIO,
  SessionCred,
} from 'common/game/socket-msgs'
import { AsyncSocketContext } from 'common/util/async_socket'

import { SessionComponent } from 'client/components/auth/auth_session'
import { CachedAuthInfo } from 'client/components/auth/cached_auth_info'

function createLoRSocket(): LoRDraftClientSocket {
  return new AsyncSocketContext(io() as LoRDraftClientSocketIO)
}

export function LoginComponent() {
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

  const authInfo = cachedAuthInfo.getStorageAuthInfo()
  const setAuthInfo = (authInfo: SessionCred) => {
    setCachedAuthInfoRef.current(CachedAuthInfo.setStorageAuthInfo(authInfo))
  }
  const clearAuthInfo = () => {
    setCachedAuthInfoRef.current(CachedAuthInfo.clearStorageAuthInfo())
  }

  return (
    <SessionComponent
      socket={socket}
      authInfo={authInfo}
      setAuthInfo={setAuthInfo}
      clearAuthInfo={clearAuthInfo}
    />
  )
}
