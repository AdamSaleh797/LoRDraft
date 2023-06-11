import React from 'react'

import headerStyle from './header.module.css'

import { APP_TITLE } from 'client/utils/constants'

export function Header(props: { children: React.ReactNode }) {
  return (
    <div className={headerStyle.header}>
      <div className={headerStyle.leftElement}>Something</div>
      <div className={headerStyle.centerTitle}>{APP_TITLE}</div>
      <div className={headerStyle.rightElement}>{props.children}</div>
    </div>
  )
}
