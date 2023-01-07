import { DraftStateInfo } from 'draft'
import React from 'react'

export interface DeckListComponentProps {
  draftState: DraftStateInfo | null
}

export function DeckList(props: DeckListComponentProps) {
  const cardCounts =
    props.draftState === null ? [] : props.draftState.deck.cardCounts

  return (
    <div>
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
