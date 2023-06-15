import React from 'react'

import { GameMetadata } from 'common/game/metadata'
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs'
import { Status, StatusCode, isOk, makeErrStatus } from 'common/util/status'

import { DraftComponent } from 'client/components/draft/Draft'
import { DraftOptionsComponent } from 'client/components/draft/DraftOptions'
import { inDraft, selectDraftState } from 'client/store/draft'
import { useLoRSelector } from 'client/store/hooks'
import { isSignedIn, selectSessionState } from 'client/store/session'

let g_inflight = false

function getGameMetadata(
  socket: LoRDraftClientSocket,
  session_cred: AuthInfo,
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

interface DraftFlowComponentProps {
  socket: LoRDraftClientSocket
  // TODO: Make this required and only render when logged in.
  // authInfo: SessionCred
}

export function DraftFlowComponent(props: DraftFlowComponentProps) {
  const session_state = useLoRSelector(selectSessionState)
  const draft_state = useLoRSelector(selectDraftState)
  // TODO add this to redux
  const [gameMetadata, setGameMetadata] = React.useState<GameMetadata | null>(
    null
  )

  const setGameMetadataRef =
    React.useRef<typeof setGameMetadata>(setGameMetadata)
  setGameMetadataRef.current = setGameMetadata

  if (!isSignedIn(session_state)) {
    return <div>Must sign in to start draft.</div>
  }

  if (gameMetadata === null) {
    getGameMetadata(props.socket, session_state.authInfo, (status) => {
      if (isOk(status)) {
        setGameMetadataRef.current(status.value)
      }
    })
  }

  if (!inDraft(draft_state)) {
    return (
      <DraftOptionsComponent
        socket={props.socket}
        authInfo={session_state.authInfo}
        gameMetadata={gameMetadata}
      />
    )
  } else {
    return (
      <DraftComponent
        socket={props.socket}
        authInfo={session_state.authInfo}
        draftState={draft_state.state}
        gameMetadata={gameMetadata}
      />
    )
  }
}
