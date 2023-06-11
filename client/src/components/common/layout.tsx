import React from 'react'

import layoutStyle from './layout.module.css'

export function Layout(props: { children: React.ReactNode }) {
  return (
    <div className={layoutStyle.parent}>
      <div className={layoutStyle.child}>{props.children}</div>
    </div>
  )
}
