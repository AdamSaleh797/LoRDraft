import './Button.css'
import React, { ReactNode, MouseEventHandler } from 'react'

type ButtonProps = {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
}

export function Button({ children, onClick, className }: ButtonProps) {
  const buttonClassName = className !== undefined ? className : 'button'

  return (
    <button className={buttonClassName} onClick={onClick}>
      {children}
    </button>
  )
}
