import { CardCount, DraftStateInfo } from 'draft'
import React from 'react'

export const CARD_TYPE_COUNT = 4

export const UNITS = 0
export const SPELLS = 1
export const LANDMARKS = 2
export const EQUIPMENTS = 3

export const enum CardTypes {
  UNIT = 'unit',
  SPELL = 'spell',
  LANDMARK = 'landmark',
  EQUIPMENT = 'equipment',
}

export interface TypeCountsComponentProps {
  draftState: DraftStateInfo | null
}

export function TypeCounts(props: TypeCountsComponentProps) {
  const type_counts: number[] = new Array(CARD_TYPE_COUNT).fill(0)

  const deck_card_counts: CardCount[] = props.draftState?.deck.cardCounts ?? []

  deck_card_counts.forEach((cardCount: CardCount) => {
    switch (cardCount.card.type) {
      case CardTypes.UNIT:
        type_counts[UNITS] += 1
        break
      case CardTypes.SPELL:
        type_counts[SPELLS] += 1
        break
      case CardTypes.LANDMARK:
        type_counts[LANDMARKS] += 1
        break
      case CardTypes.EQUIPMENT:
        type_counts[EQUIPMENTS] += 1
        break
    }
  })

  const typeCountContainer = {
    marginBottom: '10px',
  }

  return (
    <div style={typeCountContainer}>
      Units: {type_counts[UNITS]}
      <br></br>
      Spells: {type_counts[SPELLS]}
      <br></br>
      Landmarks: {type_counts[LANDMARKS]}
      <br></br>
      Equipment: {type_counts[EQUIPMENTS]}
      <br></br>
    </div>
  )
}
