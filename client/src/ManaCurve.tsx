import { CardCount, DraftStateInfo } from 'draft'
import React from 'react'

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

  const graphContainer = {
    height: '200px',
  }

  return (
    <div>
      <div style={graphContainer}>
        {histogram.map((manaValueCount) => {
          const maxCount = Math.max(...histogram, 1)

          const barStyle = {
            width: `calc(${100 / histogram.length}% - 4px)`,
            height: `${(manaValueCount / maxCount) * 200}px`,
            backgroundColor: '#1E2F97',
            display: 'inline-block',
            borderStyle: 'solid',
            borderWidth: '2px',
            marginTop: `calc(${(1 - manaValueCount / maxCount) * 200}px - 4px)`,
          }
          return <div className='histogram' style={barStyle}></div>
        })}
      </div>
      <div>
        {histogram.map((manaValueCount, count) => {
          const textStyle = {
            width: `calc(${100 / histogram.length}%)`,
            'text-align': 'center',
            display: 'inline-block',
          }

          return (
            <div className='label' style={textStyle}>
              {count === 8 ? `${count}+` : count}
              {manaValueCount === 0 ? '' : ` (${manaValueCount})`}
            </div>
          )
        })}
      </div>
    </div>
  )
}
