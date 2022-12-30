import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css'

interface Card {
  rarity: string;
  imageUrl: string;
  cost: number;
  name: string;
  regions: string[];
  subtypes: string[];
}

interface CardProps {
  card: Card
}

interface CardState {
  card: Card
}

class Cards extends React.Component<CardProps, CardState> {
  constructor(props: CardProps) {
    super(props);
    this.state = {
      card: props.card,
    }
  }

  render() {
    return (
      <div className="card">
        <img src={this.state.card.imageUrl} alt={this.state.card.name} width={400} height={500}></img>
      </div>
    );
  }
}


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const testCard: Card = {
  rarity: "Champion",
  imageUrl: "http://dd.b.pvp.net/3_21_0/set1/en_us/img/cards/01SI053.png",
  cost: 2,
  name: "Elise",
  regions: ["Shadow Isles"],
  subtypes: ["Spider"]
}

root.render(
  <Cards card={testCard} />
);


