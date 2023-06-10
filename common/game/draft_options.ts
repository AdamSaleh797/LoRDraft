import { Record as RecordT } from 'runtypes'

import { Card } from 'game/card'
import { enumToRuntype } from 'util/lor_util'

export enum DraftFormat {
  STANDARD = 'STANDARD',
  ETERNAL = 'ETERNAL',
}

export const DraftFormatT = enumToRuntype(DraftFormat)

export enum DraftRarityRestriction {
  COMMONS = 'COMMONS',
  ANY_RARITY = 'ANY_RARITY',
}

export const DraftRarityRestrictionT = enumToRuntype(DraftRarityRestriction)

export const DraftOptionsT = RecordT({
  rarityRestriction: DraftRarityRestrictionT,
  draftFormat: DraftFormatT,
})

export interface DraftOptions {
  rarityRestriction: DraftRarityRestriction
  draftFormat: DraftFormat
}

/**
 * Checks whether the given card is part of the draft format specified by `draft_options`.
 */
export function formatContainsCard(
  draft_options: DraftOptions,
  card: Card
): boolean {
  switch (draft_options.draftFormat) {
    case DraftFormat.ETERNAL: {
      break
    }
    case DraftFormat.STANDARD: {
      if (!card.isStandard) {
        return false
      }
    }
  }

  switch (draft_options.rarityRestriction) {
    case DraftRarityRestriction.ANY_RARITY: {
      break
    }
    case DraftRarityRestriction.COMMONS: {
      if (card.rarity !== 'Common') {
        return false
      }
    }
  }

  return true
}