import React, { MouseEventHandler, ReactNode } from 'react'

import styles from './Button.module.css'

interface ButtonProps {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
  disabled?: boolean
  buttonType?: 'confirm' | 'cancel' | 'normal'
}

export function Button({
  children,
  onClick,
  className,
  disabled = false,
  buttonType = 'normal',
}: ButtonProps) {
  let buttonClass = `${styles.button} ${className}`

  if (buttonType === 'cancel') {
    buttonClass += ` ${styles.cancelBtn}`
  } else if (buttonType === 'confirm') {
    buttonClass += ` ${styles.confirmBtn}`
  }

  if (disabled) {
    buttonClass += ` ${styles.disabled}`
  }

  return (
    <button className={buttonClass} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
