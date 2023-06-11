import React from 'react'

import { DraftStateInfo } from 'game/draft'
import { DraftOptions } from 'game/draft_options'
import { GameMetadata } from 'game/metadata'
import { LoRDraftClientSocket, SessionCred } from 'game/socket-msgs'
import { Status, StatusCode, isOk } from 'util/status'

import { DraftOptionsComponent } from 'client/components/draft/DraftOptions'
import { PoolComponent } from 'client/components/draft/PoolComponent'

interface DraftFlowComponentProps {
  socket: LoRDraftClientSocket
  authInfo: SessionCred
  refreshDraft: (
    session_cred: SessionCred,
    callback: (status: Status) => void
  ) => void
  draftState: DraftStateInfo | null
  setDraftState: (draft_state: DraftStateInfo | null) => void
  gameMetadata: GameMetadata | null
}

export function DraftFlowComponent(props: DraftFlowComponentProps) {
  const authInfoRef = React.useRef<SessionCred>(props.authInfo)
  authInfoRef.current = props.authInfo

  const refreshDraftRef = React.useRef<typeof props.refreshDraft>(
    () => undefined
  )
  refreshDraftRef.current = props.refreshDraft

  const setDraftStateRef = React.useRef<typeof props.setDraftState>(
    () => undefined
  )
  setDraftStateRef.current = props.setDraftState

  function joinDraft(draft_options: DraftOptions) {
    props.socket.call(
      'join_draft',
      authInfoRef.current,
      draft_options,
      (status) => {
        if (!isOk(status)) {
          if (status.status === StatusCode.ALREADY_IN_DRAFT_SESSION) {
            refreshDraftRef.current(authInfoRef.current, (status) => {
              if (!isOk(status)) {
                console.log(status)
                return
              }
            })
          } else {
            console.log(status)
          }
        } else {
          setDraftStateRef.current(status.value)
        }
      }
    )
  }

  function closeDraft() {
    props.socket.call('close_draft', authInfoRef.current, (status) => {
      if (!isOk(status)) {
        console.log(status)
      }
      setDraftStateRef.current(null)
    })
  }

  if (props.draftState === null) {
    return (
      <DraftOptionsComponent
        join_draft_fn={joinDraft}
        gameMetadata={props.gameMetadata}
      />
    )
  } else {
    return (
      <PoolComponent
        socket={props.socket}
        authInfo={props.authInfo}
        refreshDraft={props.refreshDraft}
        closeDraft={closeDraft}
        draftState={props.draftState}
        setDraftState={props.setDraftState}
      />
    )
  }
}
