import React from 'react';

import style from './RegionIcon.module.css';

import { Region } from 'common/game/card';
import { GameMetadata } from 'common/game/metadata';

export interface RegionIconComponentProps {
  region: Region;

  /**
   * The number of cards in this region.
   */
  cardCount: number;

  /**
   * If true, the region icon is rendered faded. Applied to regions which are
   * potentially, but not necessarily in the deck.
   *
   * Note: regions that are faded won't display the `cardCount`, since it's
   * ambiguous how many cards should be in each of those regions.
   */
  faded: boolean;

  gameMetadata: GameMetadata;
}

export function RegionIcon(props: RegionIconComponentProps) {
  return (
    <div
      className={`${style.regionIconContainer} ${
        props.faded ? style.faded : ''
      }`}
    >
      <img
        className={style.regionIcon}
        src={props.gameMetadata.regions[props.region].imageUrl}
      />
      {props.cardCount === 0 || props.faded ? null : (
        <div className={style.cardCountContainer}>
          <div className={style.cardCount}>{props.cardCount}</div>
        </div>
      )}
    </div>
  );
}
