import React from 'react'
import './layout.css'

export function Layout(props: { children: any }) {
  return (
    <div className='parent'>
      <div className='child'>{props.children}</div>
    </div>
  )
}
