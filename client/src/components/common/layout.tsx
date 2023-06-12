import React from 'react'

import style from './layout.module.css'

export function Layout(props: { children: React.ReactNode }) {
  return (
    <div className={style.parent}>
      <div className={style.child}>{props.children}</div>
    </div>
  )
}
