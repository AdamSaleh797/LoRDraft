import React from 'react'

import { Card } from 'common/game/card'

export interface CardComponentProps {
  card: Card | null
  numCards: number
  isSelected: boolean
  select: () => void
}

export function CardComponent(props: CardComponentProps) {
  // Card size is controlled entirely by the width of its container
  const style = {
    width: `${100 / props.numCards}%`,
    display: 'inline-block',
  }
  const img_style = {
    width: '100%',
    height: '100%',
    userDrag: 'none',
    WebkitUserDrag: 'none',
    UserSelect: 'none',

    filter: props.isSelected
      ? 'sepia(100%) saturate(300%) brightness(70%) hue-rotate(180deg)'
      : '',
  }

  return (
    <div className='card' style={style} onClick={props.select}>
      {props.card === null ? (
        <div />
      ) : (
        <img
          src={props.card.imageUrl}
          alt={props.card.name}
          style={img_style}
        ></img>
      )}
    </div>
  )
}
