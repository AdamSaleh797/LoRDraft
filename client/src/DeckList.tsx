import { DraftStateInfo, generateDeckCode } from 'draft'
import React from 'react'

export interface DeckListComponentProps {
  draftState: DraftStateInfo | null
}

export function DeckList(props: DeckListComponentProps) {
  let deckCode
  const cardCounts =
    props.draftState === null ? [] : props.draftState.deck.cardCounts
  if (
    props.draftState !== null &&
    cardCounts.reduce((count, cardCount) => {
      return count + cardCount.count
    }, 0) === 40
  ) {
    deckCode = generateDeckCode(props.draftState.deck)
  } else {
    deckCode = null
  }

  return (
    <div>
      {deckCode === null ? [] : deckCode}
      {cardCounts.map((cardCount) => {
        return (
          <div>
            {cardCount.count === 1
              ? cardCount.card.name
              : `${cardCount.card.name} x${cardCount.count}`}
          </div>
        )
      })}
    </div>
  )
}
