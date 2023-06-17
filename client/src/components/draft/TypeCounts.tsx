import React from 'react'

import style from './TypeCounts.module.css'

import { CardCount, DraftStateInfo } from 'common/game/draft'

import { EquipmentIcon } from 'client/components/draft/card_types/equipment_icon'
import { FollowerIcon } from 'client/components/draft/card_types/follower_icon'
import { LandmarkIcon } from 'client/components/draft/card_types/landmark_icon'
import { SpellIcon } from 'client/components/draft/card_types/spell_icon'

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
  draftState: DraftStateInfo
}

export function TypeCounts(props: TypeCountsComponentProps) {
  const type_counts: number[] = new Array(CARD_TYPE_COUNT).fill(0) as number[]

  const deck_card_counts: CardCount[] = props.draftState.deck.cardCounts

  deck_card_counts.forEach((card_count: CardCount) => {
    switch (card_count.card.type) {
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

  return (
    <div className={style.typeCountContainer}>
      <div className={style.typeCountText}>
        <FollowerIcon />
        <div>{type_counts[UNITS]}</div>
      </div>
      <div className={style.typeCountText}>
        <SpellIcon />
        <div>{type_counts[SPELLS]}</div>
      </div>
      <div className={style.typeCountText}>
        <LandmarkIcon />
        <div>{type_counts[LANDMARKS]}</div>
      </div>
      <div className={style.typeCountText}>
        <EquipmentIcon />
        <div>{type_counts[EQUIPMENTS]}</div>
      </div>
    </div>
  )
}
