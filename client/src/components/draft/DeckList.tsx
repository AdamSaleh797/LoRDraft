import React from 'react'

import style from './DeckList.module.css'

import {
  CARDS_PER_DECK,
  CardCount,
  DraftStateInfo,
  getDeckCode,
} from 'common/game/draft'
import { GameMetadata } from 'common/game/metadata'
import { isOk } from 'common/util/status'

import { CopyButton } from 'client/components/draft/CopyButton'
import { RegionIconList } from 'client/components/draft/RegionIconList'
import {
  CardCategory,
  TypeCategory,
  cardType,
} from 'client/components/draft/TypeCategory'
import { DraftSketch } from 'client/context/draft/draft_sketch'

export interface DeckListComponentProps {
  draftState: DraftStateInfo
  draftSketch: DraftSketch
  gameMetadata: GameMetadata | null
}

export function DeckList(props: DeckListComponentProps) {
  const cardCounts = props.draftState.deck.cardCounts

  const typeCategories = cardCounts.reduce<Record<CardCategory, CardCount[]>>(
    (typeCategories, cardCount) => {
      const type = cardType(cardCount.card)
      return {
        ...typeCategories,
        [type]: typeCategories[type].concat([cardCount]),
      }
    },
    {
      Champion: [],
      Follower: [],
      Spell: [],
      Landmark: [],
      Equipment: [],
    }
  )

  let deckCode: string | null
  if (props.draftState.deck.numCards >= CARDS_PER_DECK) {
    const code = getDeckCode(props.draftState.deck)
    if (!isOk(code)) {
      deckCode = null
    } else {
      deckCode = code.value
    }
  } else {
    deckCode = null
  }
  return (
    <div>
      <CopyButton
        textToCopy={deckCode === null ? '' : deckCode}
        buttonText='Copy Code'
      ></CopyButton>
      <RegionIconList
        draftSketch={props.draftSketch}
        gameMetadata={props.gameMetadata}
      />
      <br></br>
      <div>
        {Object.entries(typeCategories).map(([category, cardCounts]) => (
          <div key={category} className={style.typeCategoryContainer}>
            <TypeCategory
              draftState={props.draftState}
              category={category as CardCategory}
              cardCounts={cardCounts}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
