import React from 'react'

import style from './DeckList.module.css'

import { CARDS_PER_DECK, DraftStateInfo, getDeckCode } from 'common/game/draft'
import { GameMetadata } from 'common/game/metadata'
import { isOk } from 'common/util/status'

import { CardDisplay } from 'client/components/draft/CardDisplay'
import { RegionIconList } from 'client/components/draft/RegionIconList'

export interface DeckListComponentProps {
  draftState: DraftStateInfo
  gameMetadata: GameMetadata | null
}

export const ROWS = 15
export const COLUMNS = 3

export function DeckList(props: DeckListComponentProps) {
  let deckCode
  const cardCounts =
    props.draftState === null ? [] : props.draftState.deck.cardCounts
  if (
    props.draftState !== null &&
    props.draftState.deck.numCards >= CARDS_PER_DECK
  ) {
    const code = getDeckCode(props.draftState.deck)
    if (!isOk(code)) {
      deckCode = null
    } else {
      deckCode = code.value
    }
  } else {
    deckCode = null
  }

  const deckListStyle = {
    width: `${100 / COLUMNS}%`,
  }

  return (
    <div>
      <div className={style.deckList} style={deckListStyle}>
        {deckCode === null ? [] : deckCode}
      </div>
      <RegionIconList
        draftState={props.draftState}
        gameMetadata={props.gameMetadata}
      />
      <br></br>
      {Array(ROWS * COLUMNS)
        .fill(0)
        .map((_, i) => {
          const array_index = (i % COLUMNS) * ROWS + Math.floor(i / COLUMNS)
          if (array_index < cardCounts.length && props.draftState !== null) {
            return (
              <div
                key={`${cardCounts[array_index].card.cardCode}${i}`}
                style={deckListStyle}
                className={style.deckList}
              >
                <CardDisplay
                  card={cardCounts[array_index].card}
                  draftState={props.draftState}
                />
              </div>
            )
          } else {
            return <div key={i} className={style.deckCode}></div>
          }
        })}
    </div>
  )
}
