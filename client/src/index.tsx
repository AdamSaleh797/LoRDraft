import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'
import { LoRDraftClientSocket, LoRDraftClientSocketIO } from 'socket-msgs'
import { AsyncSocketContext } from 'async_socket'
import { SessionComponent } from './auth_session'

const MAX_DISPLAY_COST = 8

interface CardComponentProps {
  card: Card | null
  recordCard: (card: Card) => void
  numCards: number
}

function CardComponent(props: CardComponentProps) {
  // Card size is controlled entirely by the width of its container
  const style = {
    width: `${100 / props.numCards}%`,
    display: 'inline-block',
  }
  const img_style = {
    width: '100%',
    height: '100%',
    userDrag: 'none',
    WebkitUserDrag: 'none',
    UserSelect: 'none',
    mozUserSelect: 'none',
    webkitUserSelect: 'none',
    MsUserSelect: 'none',
  }

  const record = () => {
    if (props.card !== null) {
      props.recordCard(props.card)
    }
  }

  return (
    <div className='card' style={style} onClick={record}>
      {props.card === null ? (
        <div />
      ) : (
        <img
          src={props.card.imageUrl}
          alt={props.card.name}
          style={img_style}
        />
      )}
    </div>
  )
}

interface PoolComponentProps {
  socket: LoRDraftClientSocket
  recordCard: (card: Card) => void
}

function PoolComponent(props: PoolComponentProps) {
  const initial_names = ['Illaoi', 'Norra', 'Gwen', 'Aphelios']
  const num_cards = initial_names.length

  const [names, setNames, cards, setCards] = new Array(num_cards)
    .fill(undefined)
    .reduce<
      [
        string[],
        ((name: string) => void)[],
        (Card | null)[],
        ((card: Card | null) => void)[]
      ]
    >(
      ([names, setNames, cards, setCards], _1, idx) => {
        const [name, setName] = React.useState<string>(initial_names[idx])
        const [card, setCard] = React.useState<Card | null>(null)

        React.useMemo<void>(() => {
          props.socket.call(
            'card',
            (socket_status, err, card) => {
              if (card === null) {
                console.log('got bad card back!')
                return
              }

              addCard.current(card, idx)
            },
            name
          )
        }, [name])

        return [
          [...names, name],
          [...setNames, setName],
          [...cards, card],
          [...setCards, setCard],
        ]
      },
      [[], [], [], []]
    )

  const addCard = React.useRef<(card: Card, idx: number) => void>(
    () => undefined
  )

  console.log('RENDER!')

  addCard.current = (card, idx) => {
    console.log(setCards)
    console.log(idx, setCards[idx])
    if (card.name === names[idx]) {
      setCards[idx](card)
      console.log('added')
    } else {
      console.log(`discarded ${card.name}, found ${names[idx]} as desired card`)
    }
  }

  const switchPool = () => {
    const new_names = ['Gravitum', 'Redeemed Prodigy', 'Kindred', 'Chip']
    setNames.forEach((setName, idx) => {
      setName(new_names[idx])
    })
  }

  return (
    <div onClick={switchPool}>
      {cards.map((card) => {
        return (
          <CardComponent
            card={card}
            recordCard={props.recordCard}
            numCards={cards.length}
          />
        )
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

  const graphContainer = {
    height: '200px',
  }

  return (
    <div>
      <div style={graphContainer}>
        {histogram.map((manaValueCount) => {
          const maxCount = Math.max(...histogram, 1)

          const barStyle = {
            width: `calc(${100 / histogram.length}% - 4px)`,
            height: `${(manaValueCount / maxCount) * 200}px`,
            backgroundColor: 'blue',
            display: 'inline-block',
            borderStyle: 'solid',
            borderWidth: '2px',
            marginTop: `calc(${(1 - manaValueCount / maxCount) * 200}px - 4px)`,
          }
          return <div className='histogram' style={barStyle}></div>
        })}
      </div>
      <div>
        {histogram.map((manaValueCount, count) => {
          const textStyle = {
            width: `calc(${100 / histogram.length}%)`,
            'text-align': 'center',
            display: 'inline-block',
          }

          return (
            <div className='label' style={textStyle}>
              {count}
              {manaValueCount === 0 ? '' : ` (${manaValueCount})`}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface DeckListComponentProps {
  cards: Card[]
}

function DeckList(props: DeckListComponentProps) {
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

function createLoRSocket(): LoRDraftClientSocket {
  return new AsyncSocketContext(io() as LoRDraftClientSocketIO)
}

function Main() {
  const [cards, setCards] = React.useState<Card[]>([])
  const socket_ref = React.useRef(createLoRSocket())

  const socket = socket_ref.current

  const recordCard = (card: Card) => {
    setCards(cards.concat(card))
  }
  return (
    <div>
      <div>
        <SessionComponent socket={socket} />
      </div>
      <div>
        <PoolComponent socket={socket} recordCard={recordCard} />
      </div>
      <div>
        <ManaCurve cards={cards} />
      </div>
      <div>
        <DeckList cards={cards} />
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
