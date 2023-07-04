import React from 'react'

import styles from './header.module.css'

import { APP_TITLE } from 'client/utils/constants'

interface HeaderProps {
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
}

export function Header(props: HeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.leftElement}>{props.leftElement}</div>
      <div className={styles.centerTitle}>{APP_TITLE}</div>
      <div className={styles.rightElement}>{props.rightElement}</div>
    </div>
  )
}
