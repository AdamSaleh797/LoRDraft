import React from 'react'

import styles from './modal.module.css'

import { Button } from 'client/components/common/Button'

export interface ModalProps {
  title: string
  setOpenModal: (b: boolean) => void
  children: React.ReactNode
}

export function Modal(props: ModalProps) {
  return (
    <div className={styles.modalBackground}>
      <div className={styles.modalContainer}>
        <div className={styles.title}>
          <h4>{props.title}</h4>
        </div>
        <div className={styles.body}>{props.children}</div>
        <div className={styles.footer}>
          <Button
            className={styles.cancelBtn}
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
