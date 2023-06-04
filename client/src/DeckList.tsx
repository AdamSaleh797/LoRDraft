import { CARDS_PER_DECK, DraftStateInfo, getDeckCode } from 'draft'
import { isOk } from 'lor_util'
import React from 'react'

export interface DeckListComponentProps {
  draftState: DraftStateInfo | null
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
