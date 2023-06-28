import React, { MouseEventHandler, ReactNode } from 'react'

import styles from './button.module.css'

interface ButtonProps {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
}

export function Button({ children, onClick, className }: ButtonProps) {
  return (
    <button className={`${styles.button} ${className}`} onClick={onClick}>
      {children}
    </button>
  )
}
