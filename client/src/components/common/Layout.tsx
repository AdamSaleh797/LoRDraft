import React from 'react'

import styles from './Layout.module.css'

export function Layout(props: { children: React.ReactNode }) {
  return (
    <div className={styles.parent}>
      <div className={styles.child}>{props.children}</div>
    </div>
  )
}
