import React from 'react'

import style from './header.module.css'

import { APP_TITLE } from 'client/utils/constants'

export function Header(props: { children: React.ReactNode }) {
  return (
    <div className={style.header}>
      <div className={style.leftElement}>Something</div>
      <div className={style.centerTitle}>{APP_TITLE}</div>
      <div className={style.rightElement}>{props.children}</div>
    </div>
  )
}
