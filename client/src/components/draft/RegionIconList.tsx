import React from 'react'

import style from './RegionIconList.module.css'

import { Region, isOrigin, mainRegions, originRegions } from 'common/game/card'
import { DraftStateInfo } from 'common/game/draft'
import { GameMetadata } from 'common/game/metadata'

export interface RegionIconListComponentProps {
  draftState: DraftStateInfo | null
  gameMetadata: GameMetadata | null
}

export function RegionIconList(props: RegionIconListComponentProps) {
  // If true, all Runeterran regions should be rendered as separate icons.
  // Otherwise, the presence of any number of Runeterran regions should generate
  // only one Runeterran icon. The former scheme is only used when the two
  // regions are finalized and they are both Runeterran regions.
  const render_all_runeterran_icons =
    (props.draftState?.deck.regions?.every((region) => isOrigin(region)) ??
      false) &&
    props.draftState?.deck.regions.length === 2

  return (
    <div>
      {(mainRegions() as Region[])
        .filter((region) => {
          return props.draftState?.deck.regions.includes(region)
        })
        .concat(
          originRegions()
            .filter((region) => {
              return props.draftState?.deck.regions.includes(region)
            })
            .slice(0, render_all_runeterran_icons ? undefined : 1)
        )
        .map((region, index) => {
          if (props.gameMetadata !== null) {
            return (
              <img
                key={`${region}${index}`}
                className={style.regionIcon}
                src={props.gameMetadata.regions[region].imageUrl}
              ></img>
            )
          } else {
            return <span key={index}>{region}, </span>
          }
        })}
    </div>
  )
}