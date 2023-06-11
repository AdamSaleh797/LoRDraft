import React from 'react'

import { Card } from 'game/card'

export interface CardDisplayProps {
  card: Card | null
}

export function CardDisplay(props: CardDisplayProps) {
  // Card size is controlled entirely by the width of its container
  const style = {
    display: 'inline-block',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  }
  const img_style = {
    width: '68.6%',
    position: 'relative',
    transform: 'translate(31.4%, -66.3%)',
  } as React.CSSProperties

  const fade_style = {
    backgroundImage:
      'linear-gradient(90deg,#4066ba 30%,rgba(12,161,132,0) 70%)',
    height: '100%',
    width: '100%',
    position: 'relative',
    zIndex: 1,
  } as React.CSSProperties

  const fade_container = {
    width: '100%',
    height: '100%',
  }

  return (
    <div className='display' style={style}>
      {props.card === null ? (
        <div />
      ) : (
        <div style={fade_container}>
          <div style={fade_style}></div>
          <img
            src={props.card.fullImageUrl}
            alt={props.card.name}
            style={img_style}
          ></img>
        </div>
      )}
    </div>
  )
}
