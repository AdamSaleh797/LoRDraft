import React, { useState } from 'react'

import appStyle from './App.module.css'

import { Button } from 'client/components/common/button'
import { Header } from 'client/components/common/header'
import { Layout } from 'client/components/common/layout'
import { Modal } from 'client/components/common/modal'
import { Draft } from 'client/components/draft'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  return (
    <div className={appStyle.App}>
      <Header>
        <Button
          onClick={() => {
            setModalOpen(true)
          }}
        >
          Login
        </Button>
        {modalOpen && <Modal setOpenModal={setModalOpen} />}
      </Header>
      <Layout>
        <Draft></Draft>
      </Layout>
    </div>
  )
}
