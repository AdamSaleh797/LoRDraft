import React, { useState } from 'react'

import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs'

import { Button, Modal } from 'client/components/common'
import { DraftComponent } from 'client/components/draft/Draft'
import { ModeSelector } from 'client/components/mode-selector/ModeSelector'
import { inDraft, selectDraftState } from 'client/store/draft'
import {
  doFetchGameMetadataAsync,
  hasGameMetadata,
  selectGameMetadataState,
} from 'client/store/game_metadata'
import { useLoRDispatch, useLoRSelector } from 'client/store/hooks'

interface DraftFlowComponentProps {
  socket: LoRDraftClientSocket
  authInfo: AuthInfo
}

export function DraftFlowComponent(props: DraftFlowComponentProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const draft_state = useLoRSelector(selectDraftState)
  const game_metadata = useLoRSelector(selectGameMetadataState)
  const dispatch = useLoRDispatch()

  if (!hasGameMetadata(game_metadata)) {
    dispatch(
      doFetchGameMetadataAsync({
        socket: props.socket,
        authInfo: props.authInfo,
      })
    )
  }

  if (!inDraft(draft_state)) {
    return (
      <>
        {/* first we select the Mode, than we continue to the DraftWorkflow (DraftOptionsComponent?) from there */}
        <Button
          onClick={() => {
            setModalOpen(true)
          }}
        >
          Select your Draft Mode
        </Button>
        <div>
          {modalOpen && (
            <Modal title='Draft Options' setOpenModal={setModalOpen}>
              <ModeSelector></ModeSelector>
            </Modal>
          )}
        </div>

        {/*
        <DraftOptionsComponent
          socket={props.socket}
          authInfo={props.authInfo}
          gameMetadata={game_metadata.metadata}
        />
      */}
      </>
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
