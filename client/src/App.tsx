import { Layout } from './components/layout'
import { Draft } from './components/draft'
import './App.css'
import React, { useState } from 'react'
import { Header } from './components/header'
import { Modal } from './components/modal'
import { Button } from './components/button'

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
