import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Empty } from 'lor_util'
import { Card } from 'card'
import { LoRDraftClientSocket } from 'socket-msgs'

interface CardComponentProps {
  card: Card
}

function CardComponent(props: CardComponentProps) {
  const card = React.useState<Card>(props.card)[0]

  // Card size is controlled entirely by the width of its container
  const style = {
    width: '100%',
    display: 'inline-block',
  }
  const img_style = {
    width: '100%',
    height: '100%',
  }
  return (
    <div className='card' style={style}>
      <img src={card.imageUrl} alt={card.name} style={img_style} />
    </div>
  )
}

const socket: LoRDraftClientSocket = io()

function Main() {
  const [card, setCard] = React.useState<Card | null>(null)

  React.useEffect(() => {
    socket.on('card_res', (err, card) => {
      if (err || card === undefined) {
        console.log(err)
        return
      }
      setCard(card)
    })

    socket.emit('card_req', 'Spiderling')
  }, [])

  if (card) {
    return <CardComponent card={card} />
  } else {
    return <div />
  }
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <div style={{ width: '244px' }}>
    <Main />
  </div>
)
