import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'
import { LoRDraftClientSocket } from 'socket-msgs'
import { SessionComponent } from './auth_session'

interface CardComponentProps {
  card: Card
}

function CardComponent(props: CardComponentProps) {
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
      <img src={props.card.imageUrl} alt={props.card.name} style={img_style} />
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

    socket.emit('card_req', 'Norra')
  }, [])

  if (card) {
    return (
      <div>
        <SessionComponent socket={socket} />
        <CardComponent card={card} />
      </div>
    )
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
