import React, { MouseEventHandler, ReactNode } from 'react'

import style from './button.module.css'

interface ButtonProps {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
}

export function Button({ children, onClick, className }: ButtonProps) {
  return (
    <button className={className ?? style.button} onClick={onClick}>
      {children}
    </button>
  )
}
