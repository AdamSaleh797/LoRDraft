import React, { useState } from 'react'

import styles from './AccordionItem.module.css'

interface AccordionItemProps {
  title: string
  children: React.ReactNode
  initialState?: boolean // Optional prop to control initial state
}

export function AccordionItem({
  title,
  children,
  initialState = false,
}: AccordionItemProps) {
  const [isActive, setIsActive] = useState(initialState)

  const toggleAccordion = () => {
    setIsActive(!isActive)
  }

  return (
    <div className={styles['accordion-item-container']}>
      <div
        className={`${styles['accordion-item']} ${
          isActive ? styles.active : ''
        }`}
        onClick={toggleAccordion}
      >
        <div className={styles['accordion-item-header']}>
          <div className={styles['accordion-title']}>{title}</div>
          <div
            className={`${styles['accordion-icon']} ${
              isActive ? styles.open : ''
            }`}
          ></div>
        </div>
        {isActive && (
          <div className={styles['accordion-content']}>{children}</div>
        )}
      </div>
    </div>
  )
}
