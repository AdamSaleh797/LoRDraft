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
  authInfo: AuthInfo
}

export function DraftFlowComponent(props: DraftFlowComponentProps) {
  const draft_state = useLoRSelector(selectDraftState)
  // TODO add this to redux
  const [gameMetadata, setGameMetadata] = React.useState<GameMetadata | null>(
    null
  )

  const setGameMetadataRef =
    React.useRef<typeof setGameMetadata>(setGameMetadata)
  setGameMetadataRef.current = setGameMetadata

  if (gameMetadata === null) {
    getGameMetadata(props.socket, props.authInfo, (status) => {
      if (isOk(status)) {
        setGameMetadataRef.current(status.value)
      }
    })
  }

  if (!inDraft(draft_state)) {
    return (
      <DraftOptionsComponent
        socket={props.socket}
        authInfo={props.authInfo}
        gameMetadata={gameMetadata}
      />
    )
  } else {
    return (
      <DraftComponent
        socket={props.socket}
        authInfo={props.authInfo}
        draftState={draft_state.state}
        gameMetadata={gameMetadata}
      />
    )
  }
}
