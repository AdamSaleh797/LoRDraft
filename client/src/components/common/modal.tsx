import React from 'react'

import style from './modal.module.css'

import { LoRDraftClientSocket, SessionCred } from 'common/game/socket-msgs'

import { SignInComponent } from 'client/components/auth/SignInComponent'
import { Button } from 'client/components/common/button'

export interface ModalProps {
  setOpenModal: (b: boolean) => void
  socket: LoRDraftClientSocket
}

export function Modal(props: ModalProps) {
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
          {/* TODO make this only show up if not logged in, otherwise make it the "username" component */}
          <SignInComponent socket={props.socket}></SignInComponent>
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
