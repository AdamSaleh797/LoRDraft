import React, { useState } from 'react'

import style from './App.module.css'

import { Button } from 'client/components/common/button'
import { Header } from 'client/components/common/header'
import { Layout } from 'client/components/common/layout'
import { Modal } from 'client/components/common/modal'
import { DraftFlowComponent } from 'client/components/draft/DraftFlow'
import { useLoRDispatch, useLoRSelector } from 'client/store/hooks'
import {
  isSignedIn,
  selectSessionState,
  shouldInitialize,
  tryInitializeUserSession,
} from 'client/store/session'
import { createLoRSocket } from 'client/utils/network'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const session_state = useLoRSelector(selectSessionState)

  const socket_ref = React.useRef(createLoRSocket())
  const dispatch = useLoRDispatch()

  // If the session state has not initialized, then trigger the initialization
  if (shouldInitialize(session_state)) {
    tryInitializeUserSession(dispatch, {
      socket: socket_ref.current,
      cachedAuthInfo: session_state.cachedAuthInfo,
    })
  }

  return (
    <div className={style.App}>
      <Header>
        <Button
          onClick={() => {
            setModalOpen(true)
          }}
        >
          Login
        </Button>
        {modalOpen && (
          <Modal setOpenModal={setModalOpen} socket={socket_ref.current} />
        )}
      </Header>
      <Layout>
        {isSignedIn(session_state) ? (
          <DraftFlowComponent
            socket={socket_ref.current}
            authInfo={session_state.authInfo}
          ></DraftFlowComponent>
        ) : (
          <div>Must sign in to start a draft!</div>
        )}
      </Layout>
    </div>
  )
}
