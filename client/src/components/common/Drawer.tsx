import React, { useState } from 'react'

import styles from './drawer.module.css'

interface DrawerProps {
  children: React.ReactNode
}
//in development, stil has alot issues
export function Drawer(props: DrawerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {isOpen && (
        <div className={styles.drawerBackdrop} onClick={handleToggle} />
      )}
      <button className={styles.drawerToggle} onClick={handleToggle}>
        Toggle Drawer
      </button>
      <div className={`${styles.drawer} ${isOpen ? styles.open : ''}`}>
        {props.children}
      </div>
    </>
  )
}
