import React from 'react'

import { DraftRarityRestriction } from 'draft'

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
      <button
        onClick={() => {
          props.select_rarity_restriction_fn(DraftRarityRestriction.COMMONS)
        }}
      >
        PAUPER(COMMONS ONLY)
      </button>
      <button
        onClick={() => {
          props.select_rarity_restriction_fn(DraftRarityRestriction.ANY_RARITY)
        }}
      >
        ANY RARITY
      </button>
    </div>
  )
}
