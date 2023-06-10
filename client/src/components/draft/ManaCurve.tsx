import React from 'react'

import { CardCount, DraftStateInfo } from 'game/draft'

export const MAX_DISPLAY_COST = 8
const MANA_CURVE_HEIGHT = 150
const MANA_CURVE_WIDTH = 360

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
    height: `${MANA_CURVE_HEIGHT}px`,
    borderBottom: '1px solid black',
    width: `${MANA_CURVE_WIDTH}px`,
  }

  const barOutlineStyle = {
    height: `calc(${100}% - 1px)`,
    width: `calc(${100 / histogram.length}% - 6px)`,
    display: 'inline-block',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderBottom: '0',
    borderRadius: '11px 11px 0px 0px',
    marginLeft: '2px',
    marginRight: '2px',
    position: 'relative',
  } as React.CSSProperties

  return (
    <div>
      <div style={graphContainer}>
        {histogram.map((manaValueCount, count) => {
          const maxCount = Math.max(...histogram, 1)

          const barStyle = {
            width: `calc(${100}%)`,
            height: `${(manaValueCount / maxCount) * MANA_CURVE_HEIGHT}px`,
            backgroundImage:
              'linear-gradient(0deg, rgba(36,104,238) 0%, rgba(36,104,238,0.8) 60%, rgba(36,104,238,0.4) 90%, rgba(36,104,238,0.2) 100%)',
            display: 'inline-block',
            marginTop: `calc(${
              (1 - manaValueCount / maxCount) * MANA_CURVE_HEIGHT
            }px)`,
            borderRadius: '10px 10px 0px 0px',
            position: 'absolute',
            left: 0,
          } as React.CSSProperties

          const manaValueStyle = {
            textAlign: 'center',
            position: 'absolute',
            width: '100%',
          } as React.CSSProperties

          return (
            <div className='barOutline' style={barOutlineStyle}>
              <div className='histogram' style={barStyle}></div>
              <div className='manaValue' style={manaValueStyle}>
                {count === 8 ? `${count}+` : count}
              </div>
            </div>
          )
        })}
      </div>
      <div>
        {histogram.map((manaValueCount) => {
          const textStyle = {
            'text-align': 'center',
            display: 'inline-block',
            width: `calc(${MANA_CURVE_WIDTH / histogram.length}px)`,
          }

          return (
            <div className='label' style={textStyle}>
              {manaValueCount === 0 ? '' : `x${manaValueCount}`}
            </div>
          )
        })}
      </div>
    </div>
  )
}
