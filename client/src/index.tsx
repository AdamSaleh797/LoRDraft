import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'
import { LoRDraftClientSocket } from 'socket-msgs'

interface CardComponentProps {
  card: Card
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
  return (
    <div className='card' style={style}>
      <img src={props.card.imageUrl} alt={props.card.name} style={img_style} />
    </div>
  )
}

function PoolComponent() {
  const [cards, setCards] = React.useState<Card[]>([])
  const names = ['Illaoi', 'Norra', 'Gwen', 'Aphelios']

  socket.off('card_res')
  socket.on('card_res', (err, card) => {
    console.log('new card time !')
    if (err || card === undefined) {
      console.log(err)
      return
    }
    console.log(cards.concat([card]))
    setCards(cards.concat([card]))
    if (cards.length < 3) {
      socket.emit('card_req', names[cards.length + 1])
    }
  })

  React.useEffect(() => {
    socket.emit('card_req', names[0])
  }, [])

  return (
    <body>
      {cards.map((card) => {
        return <CardComponent card={card} />
      })}
    </body>
  )
}

const socket: LoRDraftClientSocket = io()

function Main() {
  const Pool: Card[] = []

  return <PoolComponent />
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <div style={{ width: '976px', marginLeft: 'calc(50vw - 8px - 976px/2)' }}>
    <Main />
  </div>
)
