import React, { MouseEventHandler, ReactNode } from 'react'

import 'client/components/Button.css'

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
