import React from 'react';

import style from './DeckList.module.css';

import { CardCount, DraftState, DraftStateInfo } from 'common/game/draft';
import { GameMetadata } from 'common/game/metadata';

import { RegionIconList } from 'client/components/draft/RegionIconList';
import {
  CardCategory,
  TypeCategory,
  cardType,
} from 'client/components/draft/TypeCategory';
import { DraftSketch } from 'client/context/draft/draft_sketch';

export interface DeckListComponentProps {
  draftState: DraftStateInfo;
  draftSketch: DraftSketch;
  gameMetadata: GameMetadata | null;
}

export function DeckList(props: DeckListComponentProps) {
  const cardCounts = props.draftState.deck.cardCounts;

  const typeCategories = cardCounts.reduce<Record<CardCategory, CardCount[]>>(
    (typeCategories, cardCount) => {
      const type = cardType(cardCount.card);
      return {
        ...typeCategories,
        [type]: typeCategories[type].concat([cardCount]),
      };
    },
    {
      Champion: [],
      Follower: [],
      Spell: [],
      Landmark: [],
      Equipment: [],
    }
  );

  return (
    <div>
      {props.draftState.state === DraftState.GENERATE_CODE ? (
        <></>
      ) : (
        <RegionIconList
          draftSketch={props.draftSketch}
          gameMetadata={props.gameMetadata}
        />
      )}
      <br></br>
      <div>
        {Object.entries(typeCategories).map(([category, cardCounts]) => (
          <div key={category} className={style.typeCategoryContainer}>
            <TypeCategory
              draftState={props.draftState}
              category={category as CardCategory}
              cardCounts={cardCounts}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
