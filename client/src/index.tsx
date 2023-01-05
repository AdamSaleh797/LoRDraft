import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'
import {
  LoRDraftClientSocket,
  LoRDraftClientSocketIO,
  SessionCred,
} from 'socket-msgs'
import { AsyncSocketContext } from 'async_socket'
import { getStorageAuthInfo, SessionComponent } from './auth_session'
import { isOk } from 'lor_util'

const MAX_DISPLAY_COST = 8
const POOL_SIZE = 4

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
  const [cards, setCards] = React.useState<(Card | null)[]>(
    new Array(POOL_SIZE).fill(null)
  )

  const setCardsRef = React.useRef<(cards: (Card | null)[]) => void>(
    () => undefined
  )

  setCardsRef.current = setCards

  function getInitialPool(auth_info: SessionCred) {
    props.socket.call('initial_selection', auth_info, (status, champs) => {
      if (!isOk(status) || champs === null) {
        console.log(status)
        return
      }
      setCardsRef.current(champs)
    })
  }

  function joinDraft() {
    const auth_info = getStorageAuthInfo()
    if (auth_info !== null) {
      props.socket.call('join_draft', auth_info, (status) => {
        if (!isOk(status)) {
          console.log(status)
          return
        }
        getInitialPool(auth_info)
      })
    }
  }

  return (
    <div onClick={joinDraft}>
      {cards.map((card) => {
        return (
          <CardComponent
            card={card}
            recordCard={props.recordCard}
            numCards={cards.length}
          />
        )
      })}
      <button onClick={joinDraft}>DRAFT!</button>
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
            backgroundColor: '#1E2F97',
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
              {count === 8 ? `${count}+` : count}
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
