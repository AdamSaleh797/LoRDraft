import React from 'react'

import style from './Card.module.css'

import { Card, isMainRegion } from 'common/game/card'
import { DraftStateInfo } from 'common/game/draft'

export interface CardComponentProps {
  card: Card | null
  numCards: number
  isSelected: boolean
  select: () => void
  draftState: DraftStateInfo
}

export function CardComponent(props: CardComponentProps) {
  if (props.card === null) {
    return <div className={style.card} onClick={props.select} />
  }

  const regions = props.card.regions.filter((region) =>
    props.draftState.deck.regions.includes(region)
  )
  const region = regions[0]

  return (
    <div className={style.card} onClick={props.select}>
      <img
        className={
          props.isSelected
            ? `${style.selected} ${
                isMainRegion(region) ? style[region] : style.Runeterra
              }`
            : ''
        }
        src={props.card.imageUrl}
        alt={props.card.name}
        draggable={false}
      ></img>
    </div>
  )
}
