import React from 'react'

import styles from './Drawer.module.css'

interface DrawerProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

export function Drawer(props: DrawerProps) {
  const { isOpen, onClose } = props

  const handleBackdropClick = () => {
    onClose()
  }

  const handleDrawerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  return (
    <>
      {isOpen && (
        <div className={styles.drawerBackdrop} onClick={handleBackdropClick} />
      )}
      <div
        className={`${styles.drawer} ${isOpen ? styles.open : ''}`}
        onClick={handleDrawerClick}
      >
        {props.children}
      </div>
    </>
  )
}
