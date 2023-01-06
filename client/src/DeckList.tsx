import { Card } from 'card'
import React from 'react'
import { DraftDeck } from 'socket-msgs'

export interface DeckListComponentProps {
  deck: DraftDeck | null
}

export function DeckList(props: DeckListComponentProps) {
  let map
  if (props.deck === null) {
    map = new Map<string, number>()
  } else {
    map = props.deck.cards.reduce((map, card) => {
      if (map.has(card.name)) {
        map.set(card.name, (map.get(card.name) as number) + 1)
      } else {
        map.set(card.name, 1)
      }
      return map
    }, new Map<string, number>())
  }

  return (
    <div>
      {Array.from(map.entries()).map(([name, count]) => {
        return <div>{count === 1 ? name : `${name} x${count}`}</div>
      })}
    </div>
  )
}
