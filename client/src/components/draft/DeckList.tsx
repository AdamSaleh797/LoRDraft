import React from 'react'

import style from './DeckList.module.css'

import { Card } from 'common/game/card'
import {
  CARDS_PER_DECK,
  CardCount,
  DraftStateInfo,
  getDeckCode,
} from 'common/game/draft'
import { GameMetadata } from 'common/game/metadata'
import { isOk } from 'common/util/status'

import { CardDisplay } from 'client/components/draft/CardDisplay'
import { RegionIconList } from 'client/components/draft/RegionIconList'
import { DraftSketch } from 'client/context/draft/draft_sketch'

export interface DeckListComponentProps {
  draftState: DraftStateInfo
  draftSketch: DraftSketch
  gameMetadata: GameMetadata | null
}

type CardCategory = 'Champion' | 'Follower' | 'Spell' | 'Landmark' | 'Equipment'

function cardType(card: Card): CardCategory {
  switch (card.type) {
    case 'Unit':
      if (card.rarity === 'Champion') {
        return 'Champion'
      } else {
        return 'Follower'
      }
    case 'Spell':
      return 'Spell'
    case 'Landmark':
      return 'Landmark'
    case 'Equipment':
      return 'Equipment'
    case 'Ability':
    case 'Trap':
      throw Error('Uncollectable card found in deck')
  }
}

export function DeckList(props: DeckListComponentProps) {
  let deckCode
  const cardCounts = props.draftState.deck.cardCounts
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

  return (
    <div>
      <div className={style.deckCode}>{deckCode === null ? [] : deckCode}</div>
      <RegionIconList
        draftState={props.draftState}
        draftSketch={props.draftSketch}
        gameMetadata={props.gameMetadata}
      />
      <br></br>
      {Object.entries(typeCategories).map(([_category, cardCounts]) => (
        //TODO: Use category
        <div className={style.deckListContainer}>
          {cardCounts.map((cardCount) => (
            <div className={style.cardDisplayContainer}>
              <CardDisplay
                key={cardCount.card.cardCode}
                card={cardCount.card}
                draftState={props.draftState}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
