import React, { useState } from 'react'

import style from './App.module.css'

import { SignInComponent } from 'client/components/auth/SignInComponent'
import { UserComponent } from 'client/components/auth/UserInfoComponent'
import { Button, Header, Layout, Modal, Drawer } from 'client/components/common'
import { DraftFlowComponent } from 'client/components/draft/DraftFlow'
import { useLoRDispatch, useLoRSelector } from 'client/store/hooks'
import {
  isSignedIn,
  selectSessionState,
  shouldInitialize,
  tryInitializeUserSession,
} from 'client/store/session'
import { createLoRSocket } from 'client/utils/network'
import { ModeSelector } from './components/mode-selector/ModeSelector'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

  const handleDrawerToggle = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <div className={style.App}>

      <Header
        leftElement={
          isSignedIn(session_state) ?  <Button 
            onClick={handleDrawerToggle}>
            Toggle Drawer
          </Button> : <></>
        }
        rightElement={
          <Button
            onClick={() => {
              setModalOpen(true)
            }}
          >
            Login
          </Button>
        }
      />

      {modalOpen && (
          <Modal title='Login | Registration' setOpenModal={setModalOpen}>
            <div>
              {isSignedIn(session_state) ? (
                <UserComponent
                  socket={socket_ref.current}
                  authInfo={session_state.authInfo}
                />
              ) : (
                <SignInComponent socket={socket_ref.current} />
              )}
            </div>
          </Modal>
        )}

<Drawer isOpen={isDrawerOpen} onClose={handleDrawerToggle}>
  <Layout>
    <ModeSelector></ModeSelector>
  </Layout>
</Drawer>
      <Layout>
        {isSignedIn(session_state) ? (
          
            <DraftFlowComponent
              socket={socket_ref.current}
              authInfo={session_state.authInfo}
            />
        
        ) : (
          <div>Must sign in to start a draft!</div>
        )}
      </Layout>
      
    </div>
  )
}
