import React from 'react'

import style from './modal.module.css'

import { LoginComponent } from 'client/components/auth/login-component'
import { Button } from 'client/components/common/button'

export function Modal({ setOpenModal }: { setOpenModal(b: boolean): void }) {
  return (
    <div className={style.modalBackground}>
      <div className={style.modalContainer}>
        <Button
          onClick={() => {
            setOpenModal(false)
          }}
        >
          Close &times;
        </Button>

        <div className={style.title}>
          <h3>Login | Registration</h3>
        </div>
        <div className={style.body}>
          <LoginComponent></LoginComponent>
        </div>
        <div className={style.footer}>
          <Button
            className={style.cancelBtn}
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
