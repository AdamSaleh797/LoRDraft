import React from 'react'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import style from './Card.module.css'

import { Card } from 'common/game/card'

export interface CardComponentProps {
  card: Card | null
  numCards: number
  isSelected: boolean
  select: () => void
}

export function CardComponent(props: CardComponentProps) {
  return (
    <div className={style.card} onClick={props.select}>
      {props.card === null ? (
        <div />
      ) : (
        <img
          className={props.isSelected ? style.selected : ''}
          src={props.card.imageUrl}
          alt={props.card.name}
          draggable={false}
        ></img>
      )}
    </div>
  )
}
