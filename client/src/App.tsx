import React, { useState } from 'react'

import style from './App.module.css'
import { createLoRSocket } from './utils/network'

import { SessionCred } from 'common/game/socket-msgs'

import { CachedAuthInfo } from 'client/components/auth/cached_auth_info'
import { Button } from 'client/components/common/button'
import { Header } from 'client/components/common/header'
import { Layout } from 'client/components/common/layout'
import { Modal } from 'client/components/common/modal'
import Draft from 'client/components/draft'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [cachedAuthInfo, setCachedAuthInfo] = React.useState<CachedAuthInfo>(
    CachedAuthInfo.initialStorageAuthInfo()
  )

  const socket_ref = React.useRef(createLoRSocket())

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
        <Draft socket={socket_ref.current} auth_info={cachedAuthInfo}></Draft>
      </Layout>
    </div>
  )
}
