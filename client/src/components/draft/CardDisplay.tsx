import React from 'react'

import style from './CardDisplay.module.css'
import { CardInfo } from './CardInfo'

import { Card } from 'common/game/card'
import { DraftStateInfo } from 'common/game/draft'

export interface CardDisplayProps {
  card: Card | null
  draftState: DraftStateInfo
}

export function CardDisplay(props: CardDisplayProps) {
  if (props.card === null) {
    return <div className={style.display} />
  }
  return (
    <div className={style.display}>
      <div className={style.fadeContainer}>
        <CardInfo card={props.card} draftState={props.draftState} />
        <img
          className={style.image}
          src={props.card.fullImageUrl}
          alt={props.card.name}
        ></img>
      </div>
    </div>
  )
}
