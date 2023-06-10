import { APP_TITLE } from '../utils/constants'
import './header.css'
import React from 'react'

export function Header(props: { children: any }) {
  return (
    <div className='header'>
      <div className='left-element'>Something</div>
      <div className='center-title'>{APP_TITLE}</div>
      <div className='right-element'>{props.children}</div>
    </div>
  )
}
