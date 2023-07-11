import React from 'react'

import styles from './ListItem.module.css'

interface ListItemProps {
  key: string
  title: string
  description: string
  selected: boolean
  disabled?: boolean
  onClick: () => void
}

export function ListItem(props: ListItemProps) {
  const handleClick = () => {
    if (!props.disabled) {
      props.onClick()
    }
  }

  return (
    <div
      key={props.key}
      className={`${styles['list-item']} ${
        props.selected ? styles.selected : ''
      } ${props.disabled ? styles.disabled : ''}`}
      onClick={handleClick}
    >
      <h3>{props.title}</h3>
      <p>{props.description}</p>
    </div>
  )
}
