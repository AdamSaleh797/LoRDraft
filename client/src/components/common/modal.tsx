import React from 'react'

import style from './modal.module.css'

import { LoRDraftClientSocket } from 'common/game/socket-msgs'

import { SignInComponent } from 'client/components/auth/SignInComponent'
import { UserComponent } from 'client/components/auth/UserInfoComponent'
import { Button } from 'client/components/common/button'
import { useLoRSelector } from 'client/store/hooks'
import { isSignedIn, selectSessionState } from 'client/store/session'

export interface ModalProps {
  setOpenModal: (b: boolean) => void
  socket: LoRDraftClientSocket
}

export function Modal(props: ModalProps) {
  const session_state = useLoRSelector(selectSessionState)

  return (
    <div className={style.modalBackground}>
      <div className={style.modalContainer}>
        <Button
          onClick={() => {
            props.setOpenModal(false)
          }}
        >
          Close &times;
        </Button>

        <div className={style.title}>
          <h3>Login | Registration</h3>
        </div>
        <div className={style.body}>
          {isSignedIn(session_state) ? (
            <UserComponent
              socket={props.socket}
              auth_info={session_state.authInfo}
            />
          ) : (
            <SignInComponent socket={props.socket} />
          )}
        </div>
        <div className={style.footer}>
          <Button
            className={style.cancelBtn}
            onClick={() => {
              props.setOpenModal(false)
            }}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
