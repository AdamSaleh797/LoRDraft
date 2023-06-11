import React from 'react'

import modalStyle from './modal.module.css'

import { LoginComponent } from 'client/components/auth/login-component'
import { Button } from 'client/components/common/button'

export function Modal({ setOpenModal }: { setOpenModal(b: boolean): void }) {
  return (
    <div className={modalStyle.modalBackground}>
      <div className={modalStyle.modalContainer}>
        <Button
          onClick={() => {
            setOpenModal(false)
          }}
        >
          Close &times;
        </Button>

        <div className={modalStyle.title}>
          <h3>Login | Registration</h3>
        </div>
        <div className={modalStyle.body}>
          <LoginComponent></LoginComponent>
        </div>
        <div className={modalStyle.footer}>
          <Button
            className={modalStyle.cancelBtn}
            onClick={() => {
              setOpenModal(false)
            }}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
