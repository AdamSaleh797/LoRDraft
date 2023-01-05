import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'
import { LoRDraftClientSocket, LoRDraftClientSocketIO } from 'socket-msgs'
import { AsyncSocketContext } from 'async_socket'
import { SessionComponent } from './auth_session'
import { PoolComponent } from './PoolComponent'
import { ManaCurve } from './ManaCurve'
import { DeckList } from './DeckList'

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
