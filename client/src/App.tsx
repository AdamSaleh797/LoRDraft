import { Layout } from './components/layout/layout'
import { Draft } from './components/draft/draft-main'
import './App.css'
import React, { useState } from 'react'
import { Header } from './components/header/header'
import { Modal } from './components/modal/modal'
import { Button } from './components/button/button'

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
