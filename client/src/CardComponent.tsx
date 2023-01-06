import { Card } from 'card'
import React from 'react'
import { DraftDeck } from 'socket-msgs'

export interface CardComponentProps {
  card: Card | null
  numCards: number
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
    mozUserSelect: 'none',
    webkitUserSelect: 'none',
    MsUserSelect: 'none',
  }

  return (
    <div className='card' style={style}>
      {props.card === null ? (
        <div />
      ) : (
        <img
          src={props.card.imageUrl}
          alt={props.card.name}
          style={img_style}
        />
      )}
    </div>
  )
}
