import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'
import { LoRDraftClientSocket } from 'socket-msgs'
import { SessionComponent } from './auth_session'

import { useState } from 'react'
import { createReadStream } from 'fs'
import { builtinModules } from 'module'
import { numberLiteralTypeAnnotation } from '@babel/types'

const MAX_DISPLAY_COST = 8

interface CardComponentProps {
  card: Card
  recordCard: (card: Card) => void
}

function CardComponent(props: CardComponentProps) {
  // Card size is controlled entirely by the width of its container
  const style = {
    width: '25%',
    display: 'inline-block',
  }
  const img_style = {
    width: '100%',
    height: '100%',
  }

  const record = () => {
    props.recordCard(props.card)
  }

  return (
    <div className='card' style={style} onClick={record}>
      <img src={props.card.imageUrl} alt={props.card.name} style={img_style} />
    </div>
  )
}

interface PoolComponentProps {
  recordCard: (card: Card) => void
}

function PoolComponent(props: PoolComponentProps) {
  const [cards, setCards] = React.useState<Card[]>([])
  const [names, setNames] = React.useState<string[]>([
    'Illaoi',
    'Norra',
    'Gwen',
    'Aphelios',
  ])

  socket.off('card_res')
  socket.on('card_res', (err, card) => {
    console.log('new card time !')
    if (err || card === undefined) {
      console.log(err)
      return
    }
    console.log(cards.concat([card]))
    setCards(cards.concat([card]))
    if (cards.length < names.length - 1) {
      socket.emit('card_req', names[cards.length + 1])
    }
  })

  React.useEffect(() => {
    socket.emit('card_req', names[0])
  }, [])

  const switchPool = () => {
    setCards([])
    setNames(['Viego', 'Aatrox', 'Seraphine', 'Vayne'])
    socket.emit('card_req', 'Viego')
  }

  return (
    <div onClick={switchPool}>
      {cards.map((card) => {
        return <CardComponent card={card} recordCard={props.recordCard} />
      })}
    </div>
  )
}

interface ManaCurveComponentProps {
  cards: Card[]
}

function ManaCurve(props: ManaCurveComponentProps) {
  const histogram: number[] = new Array(MAX_DISPLAY_COST + 1).fill(0)

  props.cards.forEach((card: Card) => {
    histogram[Math.min(card.cost, MAX_DISPLAY_COST)]++
  })

  return (
    <div>
      <div>
        {histogram.map((manaValueCount) => {
          const barStyle = {
            width: `calc(${100 / histogram.length}% - 4px)`,
            height: `${(manaValueCount / props.cards.length) * 200}px`,
            backgroundColor: 'blue',
            display: 'inline-block',
            borderStyle: 'solid',
            borderWidth: '2px',
          }

          return <div className='histogram' style={barStyle}></div>
        })}
      </div>
      <div>
        {histogram.map((_1, count) => {
          const textStyle = {
            width: `calc(${100 / histogram.length}% - 4px)`,
            'text-align': 'center',
            display: 'inline-block',
          }

          return (
            <div className='label' style={textStyle}>
              {count}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const socket: LoRDraftClientSocket = io()

function Main() {
  const [cards, setCards] = React.useState<Card[]>([])

  const recordCard = (card: Card) => {
    setCards(cards.concat(card))
  }
  return (
    <div>
      <div>
        <PoolComponent recordCard={recordCard} />
      </div>
      <div>
        <ManaCurve cards={cards} />
      </div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <div style={{ width: '976px', marginLeft: 'calc(50vw - 8px - 976px/2)' }}>
    <Main />
  </div>
)
