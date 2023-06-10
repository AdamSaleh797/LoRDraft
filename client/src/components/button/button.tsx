import React, { ReactNode, MouseEventHandler } from 'react'
import './Button.css'

type ButtonProps = {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return (
    <button className={'button'} onClick={onClick}>
      {children}
    </button>
  )
}
