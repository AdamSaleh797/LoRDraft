import React from 'react'

import { Card } from 'game/card'

export interface CardDisplayProps {
  card: Card | null
}

export function CardDisplay(props: CardDisplayProps) {
  // Card size is controlled entirely by the width of its container
  const style = {
    display: 'inline-block',
  }
  const img_style = {
    width: '190px',
    marginTop: '-63px',
    marginLeft: '87px',
  }

  return (
    <div className='display' style={style}>
      {props.card === null ? (
        <div />
      ) : (
        <img
          src={props.card.fullImageUrl}
          alt={props.card.name}
          style={img_style}
        ></img>
      )}
    </div>
  )
}
