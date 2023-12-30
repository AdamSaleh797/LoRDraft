import React from 'react';

import style from './TypeCategory.module.css';

import { Card } from 'common/game/card';
import { CardCount, DraftStateInfo } from 'common/game/draft';

import { CardDisplay } from 'client/components/draft/CardDisplay';
import TypeIcon from 'client/components/draft/type_icon';

export interface TypeCategoryProps {
  draftState: DraftStateInfo;
  category: CardCategory;
  cardCounts: CardCount[];
}

export type CardCategory =
  | 'Champion'
  | 'Follower'
  | 'Spell'
  | 'Landmark'
  | 'Equipment';

export function cardType(card: Card): CardCategory {
  switch (card.type) {
    case 'Unit':
      if (card.rarity === 'Champion') {
        return 'Champion';
      } else {
        return 'Follower';
      }
    case 'Spell':
      return 'Spell';
    case 'Landmark':
      return 'Landmark';
    case 'Equipment':
      return 'Equipment';
    case 'Ability':
    case 'Trap':
      throw Error('Uncollectable card found in deck');
  }
}

export function pluralizeCardCategory(cardCategory: CardCategory) {
  switch (cardCategory) {
    case 'Champion':
      return 'Champions';
    case 'Follower':
      return 'Followers';
    case 'Spell':
      return 'Spells';
    case 'Landmark':
      return 'Landmarks';
    case 'Equipment':
      return 'Equipment';
  }
}

export function TypeCategory(props: TypeCategoryProps) {
  if (props.cardCounts.length === 0) {
    return <div></div>;
  }
  return (
    <div className={style.typeCategory}>
      <div className={style.categoryLabel}>
        <div className={style.categoryIcon}>
          <TypeIcon category={props.category} />
        </div>
        <div className={style.categoryName}>
          {pluralizeCardCategory(props.category)}
        </div>
        <div className={style.categoryCount}>
          {props.cardCounts.reduce(
            (count, cardCount) => count + cardCount.count,
            0
          )}
        </div>
      </div>
      {props.cardCounts.map((cardCount) => (
        <div
          key={cardCount.card.cardCode}
          className={style.cardDisplayContainer}
        >
          <CardDisplay card={cardCount.card} draftState={props.draftState} />
        </div>
      ))}
    </div>
  );
}
