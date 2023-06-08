import { DraftStateInfo } from 'game/draft'
import { DraftOptionsComponent } from './DraftOptions'
import { isOk, Status, StatusCode } from 'util/status'
import { PoolComponent } from './PoolComponent'
import React from 'react'

import { LoRDraftClientSocket, SessionCred } from 'game/socket-msgs'

import { StateMachine } from 'util/state_machine'
import { DraftOptions } from 'game/draft_options'
import { Empty } from 'util/lor_util'

const enum FlowState {
  DRAFT_OPTIONS = 'DRAFT_OPTIONS',
  DRAFT_POOL = 'DRAFT_POOL',
}

type DraftOptionsProps = Empty

const machine_def = {
  [FlowState.DRAFT_OPTIONS]: {
    [FlowState.DRAFT_POOL]: (_: DraftOptionsProps) => {
      console.log('options -> pool')
      return {}
    },
  },
  [FlowState.DRAFT_POOL]: {},
} as const

interface DraftFlowComponentProps {
  socket: LoRDraftClientSocket
  authInfo: SessionCred
  refreshDraft: (
    session_cred: SessionCred,
    callback: (status: Status) => void
  ) => void
  draftState: DraftStateInfo | null
  updateDraftState: (
    mutator: (draft_state: DraftStateInfo | null) => DraftStateInfo | null
  ) => void
}

export function DraftFlowComponent(props: DraftFlowComponentProps) {
  const [flowState, setFlowState] = React.useState<FlowState>(
    FlowState.DRAFT_OPTIONS
  )
  const authInfoRef = React.useRef<SessionCred>(props.authInfo)
  authInfoRef.current = props.authInfo

  const refreshDraftRef = React.useRef<typeof props.refreshDraft>(
    () => undefined
  )
  refreshDraftRef.current = props.refreshDraft

  const updateDraftStateRef = React.useRef<typeof props.updateDraftState>(
    () => undefined
  )
  updateDraftStateRef.current = props.updateDraftState

  const flowStateMachineRef = React.useRef(
    StateMachine.makeStateMachine(
      machine_def,
      FlowState.DRAFT_OPTIONS,
      {} as Empty,
      setFlowState as (_: FlowState) => void
    )
  )

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
        }
        flowStateMachineRef.current.transition(
          FlowState.DRAFT_OPTIONS,
          FlowState.DRAFT_POOL
        )
      }
    )
  }

  switch (flowState) {
    case FlowState.DRAFT_OPTIONS: {
      return <DraftOptionsComponent join_draft_fn={joinDraft} />
    }
    case FlowState.DRAFT_POOL: {
      return (
        <PoolComponent
          socket={props.socket}
          authInfo={props.authInfo}
          refreshDraft={props.refreshDraft}
          draftState={props.draftState}
          updateDraftState={props.updateDraftState}
        />
      )
    }
  }
}
