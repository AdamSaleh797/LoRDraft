import React from 'react'

import style from './CardInfo.module.css'

import { Card, isMainRegion } from 'common/game/card'
import { DraftStateInfo, findCardCount } from 'common/game/draft'

export interface CardDisplayProps {
  card: Card
  draftState: DraftStateInfo
}

export function CardInfo(props: CardDisplayProps) {
  const regions = props.card.regions.filter((region) =>
    props.draftState.deck.regions.includes(region)
  )
  const region = regions[0]

  let regionColorStyle
  if (isMainRegion(region)) {
    regionColorStyle = style[region]
  } else {
    regionColorStyle = style.Runeterra
  }
  return (
    <div className={`${style.fade} ${regionColorStyle}`}>
      <div className={style.cost}>{props.card.cost}</div>
      <div className={style.name}>{props.card.name}</div>
      <div className={style.count}>
        {findCardCount(props.draftState.deck.cardCounts, props.card)?.count ??
          0}
      </div>
    </div>
  )
}
