import React from 'react'

import style from './CardDisplay.module.css'

import { Card } from 'common/game/card'

export interface CardDisplayProps {
  card: Card | null
}

export function CardDisplay(props: CardDisplayProps) {
  return (
    <div className={style.display}>
      {props.card === null ? (
        <div />
      ) : (
        <div className={style.fadeContainer}>
          <div className={style.fade}></div>
          <img
            className={style.image}
            src={props.card.fullImageUrl}
            alt={props.card.name}
          ></img>
        </div>
      )}
    </div>
  )
}
