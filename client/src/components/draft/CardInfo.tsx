import React from 'react'

import style from './CardInfo.module.css'

import { Card, isMainRegion } from 'common/game/card'
import { DraftStateInfo, findCardCount } from 'common/game/draft'

export interface CardDisplayProps {
  card: Card
  draftState: DraftStateInfo
}

export function CardInfo(props: CardDisplayProps) {
  const region = props.card.regions[0]
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

// background-image: linear-gradient(137deg,rgb(160,223,246) 16%,rgba(41,150,164,0) 25%,rgba(41,150,164,0) 104%,rgb(160,223,246) 82%),radial-gradient(circle at 50% 50%,rgb(47,79,143),rgb(41,70,129) 44%,rgb(9,127,149) 73%,rgb(45,165,183) 76%);
//border-radius: 100%;
