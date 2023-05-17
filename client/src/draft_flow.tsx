import { DraftOptions, DraftStateInfo } from 'draft'
import { DraftOptionsComponent } from './draft_options'
import { isOk, Status, StatusCode } from 'lor_util'
import { PoolComponent } from './PoolComponent'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { LoRDraftClientSocket, SessionCred } from 'socket-msgs'
import io from 'socket.io-client'
import { StateMachine } from 'state_machine'

const enum FlowState {
  DRAFT_OPTIONS = 'DRAFT_OPTIONS',
  DRAFT_POOL = 'DRAFT_POOL',
}

const machine_def = {
  [FlowState.DRAFT_OPTIONS]: {
    [FlowState.DRAFT_POOL]: () => {
      console.log('options -> pool')
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

  const flow_state_machine = new StateMachine(
    machine_def,
    flowState,
    setFlowState
  )

  function joinDraft(draft_options: DraftOptions) {
    console.log(draft_options)
    props.socket.call('join_draft', authInfoRef.current, (status) => {
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
      flow_state_machine.transition(
        FlowState.DRAFT_OPTIONS,
        FlowState.DRAFT_POOL
      )
    })
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
