import React, { useState } from 'react'

import 'client/App.css'
import { Button } from 'client/components/button'
import { Draft } from 'client/components/draft'
import { Header } from 'client/components/header'
import { Layout } from 'client/components/layout'
import { Modal } from 'client/components/modal'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  return (
    <div>
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
