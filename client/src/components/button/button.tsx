import React, { ReactNode, MouseEventHandler } from 'react'
import './Button.css'

type ButtonProps = {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export function Button({ children, onClick }: ButtonProps) {
  return (
    <button className={'button'} onClick={onClick}>
      {children}
    </button>
  )
}
