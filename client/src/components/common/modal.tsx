import React from 'react'

import style from './modal.module.css'

import { LoRDraftClientSocket, SessionCred } from 'common/game/socket-msgs'

import { SessionComponent } from 'client/components/auth/auth_session'
import { Button } from 'client/components/common/button'

export interface ModalProps {
  setOpenModal: (b: boolean) => void
  socket: LoRDraftClientSocket
  authInfo: SessionCred | null
  setAuthInfo: (auth_info: SessionCred) => void
  clearAuthInfo: () => void
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
          <SessionComponent
            socket={props.socket}
            authInfo={props.authInfo}
            setAuthInfo={props.setAuthInfo}
            clearAuthInfo={props.clearAuthInfo}
          ></SessionComponent>
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
