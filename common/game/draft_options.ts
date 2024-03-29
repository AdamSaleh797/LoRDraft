import { Record as RecordT } from 'runtypes';

import { Card } from 'common/game/card';
import { DraftFormat, DraftFormatT } from 'common/game/metadata';
import { enumToRuntype } from 'common/util/lor_util';

export enum DraftRarityRestriction {
  COMMONS = 'COMMONS',
  ANY_RARITY = 'ANY_RARITY',
}

export const DraftRarityRestrictionT = enumToRuntype(DraftRarityRestriction);

export function allRarityRestrictions(): DraftRarityRestriction[] {
  return Object.values(DraftRarityRestriction);
}

export function rarityDisplayName(rarity: DraftRarityRestriction): string {
  switch (rarity) {
    case DraftRarityRestriction.ANY_RARITY:
      return 'Any Rarity';
    case DraftRarityRestriction.COMMONS:
      return 'Commons Only';
  }
}

export const DraftOptionsT = RecordT({
  rarityRestriction: DraftRarityRestrictionT,
  draftFormat: DraftFormatT,
});

export interface DraftOptions {
  rarityRestriction: DraftRarityRestriction;
  draftFormat: DraftFormat;
}

export const defaultFormat: DraftFormat = 'Eternal';
export const defaultRarity = DraftRarityRestriction.ANY_RARITY;
export const defaultDraftOptions: DraftOptions = {
  draftFormat: defaultFormat,
  rarityRestriction: defaultRarity,
};

/**
 * Checks whether the given card is part of the draft format specified by `draft_options`.
 */
export function formatContainsCard(
  draft_options: DraftOptions,
  card: Card
): boolean {
  switch (draft_options.draftFormat) {
    case 'Eternal':
    case 'FREE_BUILD': {
      break;
    }
    case 'Standard': {
      if (!card.isStandard) {
        return false;
      }
      break;
    }
  }

  switch (draft_options.rarityRestriction) {
    case DraftRarityRestriction.ANY_RARITY: {
      break;
    }
    case DraftRarityRestriction.COMMONS: {
      if (card.rarity !== 'Common') {
        return false;
      }
    }
  }

  return true;
}
