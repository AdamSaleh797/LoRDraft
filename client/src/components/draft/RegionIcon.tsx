import React from 'react'

import style from './RegionIcon.module.css'

import { Region } from 'common/game/card'
import { GameMetadata } from 'common/game/metadata'

export interface RegionIconComponentProps {
  region: Region

  /**
   * The number of cards in this region.
   */
  cardCount: number

  /**
   * A list of regions which are necessarily in the deck, no matter which cards
   * are chosen in the future.
   */
  certainRegions: Region[]

  gameMetadata: GameMetadata
}

export function RegionIcon(props: RegionIconComponentProps) {
  // Note: regions that are faded won't display the `cardCount`, since it's
  // ambiguous how many cards should be in each of those regions.
  const faded = !props.certainRegions.includes(props.region)

  return (
    <div className={`${style.regionIconContainer} ${faded ? style.faded : ''}`}>
      <img
        className={style.regionIcon}
        src={props.gameMetadata.regions[props.region].imageUrl}
      />
      {props.cardCount === 0 || faded ? (
        []
      ) : (
        <div className={style.cardCountContainer}>
          <div className={style.cardCount}>{props.cardCount}</div>
        </div>
      )}
    </div>
  )
}
