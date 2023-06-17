import React from 'react'

import { Region, isOrigin, mainRegions, originRegions } from 'common/game/card'
import { DraftStateInfo, certainRegionsForDeck } from 'common/game/draft'
import { GameMetadata } from 'common/game/metadata'

import { RegionIcon } from 'client/components/draft/RegionIcon'

export interface RegionIconListComponentProps {
  draftState: DraftStateInfo
  gameMetadata: GameMetadata | null
}

export function RegionIconList(props: RegionIconListComponentProps) {
  // If true, all Runeterran regions should be rendered as separate icons.
  // Otherwise, the presence of any number of Runeterran regions should generate
  // only one Runeterran icon. The former scheme is only used when the two
  // regions are finalized and they are both Runeterran regions.
  const render_all_runeterran_icons =
    props.draftState.deck.regions.every((region) => isOrigin(region)) &&
    props.draftState.deck.regions.length === 2

  const certain_regions = certainRegionsForDeck(props.draftState.deck)

  const regions_to_render = (mainRegions() as Region[])
    .filter((region) => {
      return props.draftState.deck.regions.includes(region)
    })
    .concat(
      originRegions()
        .filter((region) => {
          return props.draftState.deck.regions.includes(region)
        })
        // If `render_all_runeterran_icons`, leave the list unchanged,
        // otherwise only take the first element from the list of origin
        // regions.
        .slice(0, render_all_runeterran_icons ? undefined : 1)
    )
    // Place certain regions first, followed by uncertain regions.
    .sort(
      (a, b) =>
        (certain_regions.includes(b) ? 1 : 0) -
        (certain_regions.includes(a) ? 1 : 0)
    )
    .map((region) => {
      return {
        region,
        count: props.draftState.deck.cardCounts.reduce(
          (count, { card }) => count + (card.regions[0] === region ? 1 : 0),
          0
        ),
      }
    })

  return (
    <div>
      {regions_to_render.map(({ region, count }, index) => {
        if (props.gameMetadata !== null) {
          return (
            <RegionIcon
              key={`${region}${index}`}
              region={region}
              cardCount={count}
              certainRegions={certain_regions}
              gameMetadata={props.gameMetadata}
            />
          )
        } else {
          // TODO make this alt less ugly.
          return <span key={index}>{region}, </span>
        }
      })}
    </div>
  )
}
