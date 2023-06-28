import React from 'react'

import { DraftRarityRestriction } from 'common/game/draft_options'

import { Button } from 'client/components/common'

interface DraftRarityRestrictionComponentProps {
  selectRarityRestrictionFn: (
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
          props.selectRarityRestrictionFn(DraftRarityRestriction.COMMONS)
        }}
      >
        PAUPER(COMMONS ONLY)
      </Button>
      <Button
        onClick={() => {
          props.selectRarityRestrictionFn(DraftRarityRestriction.ANY_RARITY)
        }}
      >
        ANY RARITY
      </Button>
    </div>
  )
}
