import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'
import { LoginCred, LoRDraftClientSocket } from 'socket-msgs'
import { Status } from 'lor_util'

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

    socket.on('login_res', (status, session_cred) => {
      console.log(status)
      console.log(session_cred)
      console.log(session_cred?.token)
    })

    socket.emit('card_req', 'Norra')
    socket.emit('login_req', { username: 'clayton', password: 'test_pw' })
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
