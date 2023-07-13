import React from 'react'

import styles from './ListItem.module.css'

interface ListItemProps {
  key: string
  title: string
  description: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
}

export function ListItem({
  key,
  title,
  description,
  selected,
  onClick,
  disabled = false,
}: ListItemProps) {
  const handleClick = () => {
    if (!disabled) {
      onClick()
    }
  }

  return (
    <div
      key={key}
      className={`${styles['list-item']} ${selected ? styles.selected : ''} ${
        disabled ? styles.disabled : ''
      }`}
      onClick={handleClick}
    >
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}
