import { Buffer } from 'buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'
import { LoRDraftClientSocket } from 'socket-msgs'
import { isOk } from 'lor_util'

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

      if (isOk(status) && session_cred !== undefined) {
        console.log(
          `saving token to session storage: ${session_cred.token.toString(
            'base64'
          )}`
        )
        window.sessionStorage.setItem(
          'token',
          session_cred.token.toString('base64')
        )
      }
    })

    socket.on('join_session_res', (status, session_cred) => {
      console.log('joined session')
      console.log(status)

      if (isOk(status)) {
        setTimeout(() => {
          console.log('logging out!')

          socket.emit('logout_req', session_cred)
        }, 10000)
      } else {
        console.log('clearing token session storage')
        window.sessionStorage.removeItem('token')
      }
    })

    socket.on('logout_res', (status) => {
      console.log('logout response:')
      console.log(status)

      window.sessionStorage.removeItem('token')
    })

    socket.emit('card_req', 'Norra')

    const token_str = window.sessionStorage.getItem('token')
    if (token_str === null) {
      console.log('no token found in session storage')
      socket.emit('login_req', { username: 'clayton', password: 'test_pw' })
    } else {
      console.log(`found token ${token_str}`)
      const token = Buffer.from(token_str, 'base64')
      socket.emit('join_session_req', { username: 'clayton', token: token })
    }
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
