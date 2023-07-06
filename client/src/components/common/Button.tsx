import React, { MouseEventHandler, ReactNode } from 'react'

import styles from './button.module.css'

interface ButtonProps {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
  buttonType?: 'confirm' | 'cancel' | 'normal'
}

export function Button({
  children,
  onClick,
  className,
  buttonType = 'normal',
}: ButtonProps) {
  let buttonClass = `${styles.button} ${className}`

  if (buttonType === 'cancel') {
    buttonClass += ` ${styles.cancelBtn}`
  } else if (buttonType === 'confirm') {
    buttonClass += ` ${styles.confirmBtn}`
  }

  return (
    <button className={buttonClass} onClick={onClick}>
      {children}
    </button>
  )
}
