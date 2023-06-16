import React from 'react'

import style from './Card.module.css'

import { Card } from 'common/game/card'

export interface CardComponentProps {
  card: Card | null
  numCards: number
  isSelected: boolean
  select: () => void
}

export function CardComponent(props: CardComponentProps) {
  // Card size is controlled entirely by the width of its container
  const card_style = {
    width: `${100 / props.numCards}%`,
  }

  return (
    <div className={style.card} style={card_style} onClick={props.select}>
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
