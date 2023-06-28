import React from 'react'

import styles from './header.module.css'

import { APP_TITLE } from 'client/utils/constants'

export function Header(props: { children: React.ReactNode }) {
  return (
    <div className={styles.header}>
      <div className={styles.leftElement}>Something</div>
      <div className={styles.centerTitle}>{APP_TITLE}</div>
      <div className={styles.rightElement}>{props.children}</div>
    </div>
  )
}
