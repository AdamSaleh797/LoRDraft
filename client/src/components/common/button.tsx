import React, { MouseEventHandler, ReactNode } from 'react'

import buttonStyle from './button.module.css'

type ButtonProps = {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
}

export function Button({ children, onClick, className }: ButtonProps) {
  return (
    <button className={className ?? buttonStyle.button} onClick={onClick}>
      {children}
    </button>
  )
}
