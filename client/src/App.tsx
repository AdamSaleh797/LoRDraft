import './App.css'
import { Button } from './components/button'
import { Draft } from './components/draft'
import { Header } from './components/header'
import { Layout } from './components/layout'
import { Modal } from './components/modal'

import React, { useState } from 'react'

function App() {
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

export default App
