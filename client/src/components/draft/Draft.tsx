import React from 'react'

import style from './Draft.module.css'

import { DraftStateInfo } from 'common/game/draft'
import { GameMetadata } from 'common/game/metadata'
import { LoRDraftClientSocket, SessionCred } from 'common/game/socket-msgs'
import {
  OkStatus,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
} from 'common/util/status'

import { CachedAuthInfo } from 'client/components/auth/cached_auth_info'
import { DeckList } from 'client/components/draft/DeckList'
import { DraftFlowComponent } from 'client/components/draft/DraftFlow'
import { ManaCurve } from 'client/components/draft/ManaCurve'
import { TypeCounts } from 'client/components/draft/TypeCounts'

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

export interface DraftProps {
  socket: LoRDraftClientSocket
  auth_info: CachedAuthInfo
}

export function Draft(props: DraftProps) {
  const [draftState, setDraftState] = React.useState<DraftStateInfo | null>(
    null
  )
  const [gameMetadata, setGameMetadata] = React.useState<GameMetadata | null>(
    null
  )

  const draftStateRef = React.useRef<DraftStateInfo | null>(draftState)
  const setDraftStateRef = React.useRef<typeof setDraftState>(() => undefined)
  const setGameMetadataRef =
    React.useRef<typeof setGameMetadata>(setGameMetadata)

  draftStateRef.current = draftState
  setDraftStateRef.current = setDraftState
  setGameMetadataRef.current = setGameMetadata

  const refreshDraft = (
    session_cred: SessionCred,
    callback: (status: Status) => void
  ) => {
    props.socket.call('current_draft', session_cred, (status) => {
      if (!isOk(status)) {
        callback(status)
        return
      }
      const draft_state_info = status.value
      setDraftStateRef.current(draft_state_info)
      callback(OkStatus)
    })
  }

  const authInfo = props.auth_info.getStorageAuthInfo()

  if (authInfo !== null && gameMetadata === null) {
    getGameMetadata(props.socket, authInfo, (status) => {
      if (isOk(status)) {
        setGameMetadataRef.current(status.value)
      }
    })
  }

  return (
    <div>
      <div>
        {authInfo === null ? (
          []
        ) : (
          <DraftFlowComponent
            socket={props.socket}
            authInfo={authInfo}
            refreshDraft={refreshDraft}
            draftState={draftState}
            setDraftState={setDraftState}
            gameMetadata={gameMetadata}
          />
        )}
      </div>
      <div className={style.deckInfoDisplay}>
        <ManaCurve draftState={draftState} />
      </div>
      <div className={style.deckInfoDisplay}>
        <TypeCounts draftState={draftState} />
      </div>
      <div>
        <DeckList draftState={draftState} gameMetadata={gameMetadata} />
      </div>
    </div>
  )
}
