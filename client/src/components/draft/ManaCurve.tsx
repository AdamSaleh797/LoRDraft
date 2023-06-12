import React from 'react'

import style from './ManaCurve.module.css'

import { CardCount, DraftStateInfo } from 'common/game/draft'

export const MAX_DISPLAY_COST = 8

export interface ManaCurveComponentProps {
  draftState: DraftStateInfo | null
}

export function ManaCurve(props: ManaCurveComponentProps) {
  const histogram: number[] = new Array(MAX_DISPLAY_COST + 1).fill(0)

  const deck_card_counts: CardCount[] = props.draftState?.deck.cardCounts ?? []

  deck_card_counts.forEach((cardCount: CardCount) => {
    histogram[Math.min(cardCount.card.cost, MAX_DISPLAY_COST)] +=
      cardCount.count
  })

  const barOutlineStyle = {
    width: `calc(${100 / histogram.length}% - 4px)`,
  }

  return (
    <div>
      <div className={style.graph}>
        {histogram.map((manaValueCount, count) => {
          const maxCount = Math.max(...histogram, 1)

          const barStyle: React.CSSProperties = {
            height: `${(manaValueCount / maxCount) * 100}%`,
          }

          return (
            <div
              key={`${manaValueCount}${count}`}
              className={style.barOutline}
              style={barOutlineStyle}
            >
              <div className={style.bar} style={barStyle}></div>
              <div className={style.manaValue}>
                {count === 8 ? `${count}+` : count}
              </div>
            </div>
          )
        })}
      </div>
      <div>
        {histogram.map((manaValueCount, index) => {
          const textStyle = {
            width: `calc(${100 / histogram.length}%)`,
          }

          return (
            <div
              key={`${manaValueCount}${index}`}
              className={style.manaValueText}
              style={textStyle}
            >
              {manaValueCount === 0 ? '' : `x${manaValueCount}`}
            </div>
          )
        })}
      </div>
    </div>
  )
}
