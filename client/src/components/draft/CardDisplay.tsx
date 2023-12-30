import React from 'react';

import style from './CardDisplay.module.css';

import { Card } from 'common/game/card';
import { DraftStateInfo } from 'common/game/draft';

import { CardInfo } from 'client/components/draft/CardInfo';

export interface CardDisplayProps {
  card: Card | null;
  draftState: DraftStateInfo;
}

export function CardDisplay(props: CardDisplayProps) {
  if (props.card === null) {
    return <div className={style.display} />;
  }
  return (
    <div className={style.display}>
      <img src={props.card.imageUrl} className={style.hoverImage} />
      <div className={style.fadeContainer}>
        <CardInfo card={props.card} draftState={props.draftState} />
        <img
          className={
            ['Spell', 'Equipment'].includes(props.card.type)
              ? style.circleImage
              : style.rectangleImage
          }
          src={props.card.fullImageUrl}
          alt={props.card.name}
        ></img>
      </div>
    </div>
  );
}
