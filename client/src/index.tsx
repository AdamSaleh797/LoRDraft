import React from 'react'
import ReactDOM from 'react-dom/client'
import io from 'socket.io-client'

import { Card } from 'card'

interface CardComponentProps {
  card: Card
}

interface CardComponentState {
  card: Card
}

class CardComponent extends React.Component<
  CardComponentProps,
  CardComponentState
> {
  constructor(props: CardComponentProps) {
    super(props)
    this.state = {
      card: props.card,
    }
  }

  render() {
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
        <img
          src={this.state.card.imageUrl}
          alt={this.state.card.name}
          style={img_style}
        />
      </div>
    )
  }
}

const socket = io()

const test_card: Card = {
  name: 'Fading Memories',
  rarity: 'RARE',
  imageUrl: 'http://dd.b.pvp.net/3_21_0/set1/en_us/img/cards/01SI047.png',
  cost: 0,
  regions: ['Shadow Isles'],
  subtypes: [],
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <div style={{ width: '244px' }}>
    <CardComponent card={test_card} />
  </div>
)
