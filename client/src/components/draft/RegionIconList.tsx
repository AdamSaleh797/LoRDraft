import React from 'react';

import {
  Region,
  mainRegions,
  originRegions,
  regionContains,
} from 'common/game/card';
import { certainRegionsForDeck } from 'common/game/draft';
import { GameMetadata } from 'common/game/metadata';

import { RegionIcon } from 'client/components/draft/RegionIcon';
import { DraftSketch } from 'client/context/draft/draft_sketch';

export interface RegionIconListComponentProps {
  draftSketch: DraftSketch;
  gameMetadata: GameMetadata | null;
}

export function RegionIconList(props: RegionIconListComponentProps) {
  const certain_regions = certainRegionsForDeck(props.draftSketch.deck);

  const regions_to_render = (mainRegions() as Region[])
    .filter((region) => {
      return props.draftSketch.deck.regions.includes(region);
    })
    // Include all certain Runeterran regions.
    .concat(
      originRegions().filter((region) => certain_regions.includes(region))
    )
    // Include at most one uncertain Runeterran region. This is done because
    // Runeterran regions all have the same symbol icon, so displaying any more
    // than one makes the region list look a bit silly.
    .concat(
      originRegions()
        .filter(
          (region) =>
            props.draftSketch.deck.regions.includes(region) &&
            !certain_regions.includes(region)
        )
        .slice(0, 1)
    )
    // Place certain regions first, followed by uncertain regions.
    .sort(
      (a, b) =>
        (certain_regions.includes(b) ? 1 : 0) -
        (certain_regions.includes(a) ? 1 : 0)
    );

  const region_counts = props.draftSketch.deck.cardCounts.reduce<
    Partial<Record<Region, number>>
  >(
    (region_counts, card_count) => {
      const region = regions_to_render.find((region) =>
        regionContains(region, card_count.card)
      );
      if (region === undefined) {
        return region_counts;
      }

      return {
        ...region_counts,
        [region]: (region_counts[region] ?? 0) + card_count.count,
      };
    },
    regions_to_render.reduce(
      (region_counts, region) => ({ ...region_counts, [region]: 0 }),
      {}
    )
  );

  return (
    <div>
      {Object.entries(region_counts).map(([region, count], index) => {
        if (props.gameMetadata !== null) {
          return (
            <RegionIcon
              key={`${region}${index}`}
              region={region as Region}
              cardCount={count}
              faded={
                props.draftSketch.deck.options.draftFormat === 'FREE_BUILD' ||
                !certain_regions.includes(region as Region)
              }
              gameMetadata={props.gameMetadata}
            />
          );
        } else {
          // TODO make this alt less ugly.
          return <span key={index}>{region}, </span>;
        }
      })}
    </div>
  );
}
