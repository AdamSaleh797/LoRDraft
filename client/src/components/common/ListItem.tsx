import React from 'react'

import styles from './ListItem.module.css'

interface ListItemProps {
  key: string
  title: string
  description: string
  selected: boolean
  onClick: () => void
}

export function ListItem(props: ListItemProps) {
  return (
    <div
      key={props.key}
      className={`${styles['list-item']} ${
        props.selected ? styles.selected : ''
      }`}
      onClick={props.onClick}
    >
      <h3>{props.title}</h3>
      <p>{props.description}</p>
    </div>
  )
}
