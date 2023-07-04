import React from 'react'

import styles from './ButtonGroup.module.css'

import { Button } from 'client/components/common/Button'

interface ButtonGroupProps {
  buttons: { id: string; label: string }[]
  selectedButton: string
  onButtonClick: (buttonId: string) => void
}

export function ButtonGroup({
  buttons,
  selectedButton,
  onButtonClick,
}: ButtonGroupProps) {
  return (
    <div className={styles.buttonGroup}>
      {buttons.map((button) => (
        <Button
          key={button.id}
          className={`${selectedButton === button.id ? styles.selected : ''}`}
          onClick={() => {
            onButtonClick(button.id)
          }}
        >
          {button.label}
        </Button>
      ))}
    </div>
  )
}
