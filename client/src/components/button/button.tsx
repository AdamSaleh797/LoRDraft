import React, { ReactNode, MouseEventHandler } from 'react'
import './Button.css'

type ButtonProps = {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
}

export function Button({ children, onClick, className}: ButtonProps) {
  const buttonClassName = className ? className : 'button'

  return (
    <button className={buttonClassName} onClick={onClick}>
      {children}
    </button>
  )
}
