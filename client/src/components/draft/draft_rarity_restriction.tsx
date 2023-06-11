import React from 'react'

import { DraftRarityRestriction } from 'game/draft_options'

import { Button } from 'client/components/button'

interface DraftRarityRestrictionComponentProps {
  select_rarity_restriction_fn: (
    draft_rarity_restriction: DraftRarityRestriction
  ) => void
}

export function DraftRarityRestrictionComponent(
  props: DraftRarityRestrictionComponentProps
) {
  return (
    <div>
      <Button
        onClick={() => {
          props.select_rarity_restriction_fn(DraftRarityRestriction.COMMONS)
        }}
      >
        PAUPER(COMMONS ONLY)
      </Button>
      <Button
        onClick={() => {
          props.select_rarity_restriction_fn(DraftRarityRestriction.ANY_RARITY)
        }}
      >
        ANY RARITY
      </Button>
    </div>
  )
}
