import { Card } from 'card'
import React from 'react'
export interface DeckListComponentProps {
  cards: Card[]
}

export function DeckList(props: DeckListComponentProps) {
  const map = props.cards.reduce((map, card) => {
    if (map.has(card.name)) {
      map.set(card.name, (map.get(card.name) as number) + 1)
    } else {
      map.set(card.name, 1)
    }
    return map
  }, new Map<string, number>())

  return (
    <div>
      {Array.from(map.entries()).map(([name, count]) => {
        return <div>{count === 1 ? name : `${name} x${count}`}</div>
      })}
    </div>
  )
}
