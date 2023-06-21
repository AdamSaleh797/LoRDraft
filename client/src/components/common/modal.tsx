import React from 'react'

import style from './modal.module.css'

import { Button } from 'client/components/common/button'

export interface ModalProps {
  title: string
  setOpenModal: (b: boolean) => void
  children: React.ReactNode
}

export function Modal(props: ModalProps) {
  return (
    <div className={style.modalBackground}>
      <div className={style.modalContainer}>
        <div className={style.title}>
          <h4>{props.title}</h4>
        </div>
        <div className={style.body}>{props.children}</div>
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
