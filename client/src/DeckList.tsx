import React from 'react'

import { allRegions } from 'game/card'
import { CARDS_PER_DECK, DraftStateInfo, getDeckCode } from 'game/draft'
import { GameMetadata } from 'game/metadata'
import { isOk } from 'util/status'

export interface DeckListComponentProps {
  draftState: DraftStateInfo | null
  gameMetadata: GameMetadata | null
}

export const ROWS = 10
export const COLUMNS = 5

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

  const regionIconStyle = {
    width: '30px',
  }

  const deckListContainer = {
    width: `${100 / COLUMNS}%`,
    display: 'inline-block',
  }

  const deckCodeContainer = {
    overflowWrap: 'break-word',
  }

  return (
    <div>
      <div style={deckCodeContainer as any}>
        {deckCode === null ? [] : deckCode}
      </div>
      <div>
        {allRegions()
          .filter((region) => {
            return props.draftState?.deck.regions.includes(region)
          })
          .map((region) => {
            if (props.gameMetadata !== null) {
              return (
                <img
                  src={props.gameMetadata.regions[region].imageUrl}
                  style={regionIconStyle}
                ></img>
              )
            } else {
              return <span>{region}, </span>
            }
          })}
      </div>
      <br></br>
      {Array(ROWS * COLUMNS)
        .fill(0)
        .map((_, i) => {
          const array_index = (i % 5) * 10 + Math.floor(i / 5)
          if (array_index < cardCounts.length) {
            return (
              <div style={deckListContainer}>
                {cardCounts[array_index].count === 1
                  ? cardCounts[array_index].card.name
                  : `${cardCounts[array_index].card.name} x${cardCounts[array_index].count}`}
              </div>
            )
          } else {
            return <div style={deckListContainer}></div>
          }
        })}
    </div>
  )
}
