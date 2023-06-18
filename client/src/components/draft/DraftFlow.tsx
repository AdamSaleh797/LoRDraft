import React from 'react'

import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs'

import { DraftComponent } from 'client/components/draft/Draft'
import { DraftOptionsComponent } from 'client/components/draft/DraftOptions'
import { inDraft, selectDraftState } from 'client/store/draft'
import {
  fetchGameMetadataAsync,
  hasGameMetadata,
  selectGameMetadataState,
} from 'client/store/game_metadata'
import { useLoRDispatch, useLoRSelector } from 'client/store/hooks'

interface DraftFlowComponentProps {
  socket: LoRDraftClientSocket
  authInfo: AuthInfo
}

export function DraftFlowComponent(props: DraftFlowComponentProps) {
  const draft_state = useLoRSelector(selectDraftState)
  const game_metadata = useLoRSelector(selectGameMetadataState)
  const dispatch = useLoRDispatch()

  if (!hasGameMetadata(game_metadata)) {
    fetchGameMetadataAsync(dispatch, {
      socket: props.socket,
      authInfo: props.authInfo,
    })
  }

  if (!inDraft(draft_state)) {
    return (
      <DraftOptionsComponent
        socket={props.socket}
        authInfo={props.authInfo}
        gameMetadata={game_metadata.metadata}
      />
    )
  } else {
    return (
      <DraftComponent
        socket={props.socket}
        authInfo={props.authInfo}
        draftState={draft_state.state}
        gameMetadata={game_metadata.metadata}
      />
    )
  }
}
