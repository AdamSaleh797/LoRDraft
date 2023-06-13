import React, { useState } from 'react'

import style from './App.module.css'

import { Button } from 'client/components/common/button'
import { Header } from 'client/components/common/header'
import { Layout } from 'client/components/common/layout'
import { Modal } from 'client/components/common/modal'
import Draft from 'client/components/draft'
import { useLoRDispatch, useLoRSelector } from 'client/store/hooks'
import {
  doInitializeAsync,
  selectSessionState,
  shouldInitialize,
} from 'client/store/session'
import { createLoRSocket } from 'client/utils/network'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const session_state = useLoRSelector(selectSessionState)

  const socket_ref = React.useRef(createLoRSocket())
  const dispatcher = useLoRDispatch()

  // If the session state has not initialized, then trigger the initialization
  if (shouldInitialize(session_state)) {
    dispatcher(
      doInitializeAsync({
        socket: socket_ref.current,
        cached_auth_info: session_state.cached_auth_info,
      })
    )
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
        <Draft socket={socket_ref.current}></Draft>
      </Layout>
    </div>
  )
}
