import {
  Card,
  CardT,
  Region,
  STANDARD_FORMAT_REF,
  SetPackCardT,
  allRegions,
  isChampion,
  isRuneterran,
  regionContains,
  runeterranOrigin,
} from 'common/game/card';
import { keyInUnknown } from 'common/util/lor_util';
import {
  ErrStatusT,
  OkStatusT,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status';

import { readBundle } from 'server/bundle';
import bundles from 'server/config/bundles.json';

export interface RegionSet {
  champs: readonly Card[];
  nonChamps: readonly Card[];
}
export type RegionSetMap = Record<Region, RegionSet>;

const SET_PACKS = bundles
  .filter((bundle) => bundle.setName !== 'core')
  .map((bundle) => `${bundle.setName}-en_us.json`);

let g_region_sets: RegionSetMap | undefined;

async function loadSetPack(bundle: string): Promise<Status<readonly Card[]>> {
  const data = await readBundle(bundle);
  if (!isOk(data)) {
    return data;
  }

  const obj = JSON.parse(data.value) as unknown[];
  const cards: Card[] = [];
  for (const parsed_card of obj) {
    if (!SetPackCardT.guard(parsed_card)) {
      if (
        keyInUnknown(parsed_card, 'collectible') &&
        typeof parsed_card.collectible === 'boolean' &&
        !parsed_card.collectible
      ) {
        // Silently ignore non-collectible cards that don't match the
        // expected format.
        continue;
      }

      let ident = '?';
      if (
        keyInUnknown(parsed_card, 'cardCode') &&
        typeof parsed_card.cardCode === 'string'
      ) {
        ident = parsed_card.cardCode;
      } else if (
        keyInUnknown(parsed_card, 'name') &&
        typeof parsed_card.name === 'string'
      ) {
        ident = parsed_card.name;
      }

      return makeErrStatus(
        StatusCode.INVALID_SET_PACK_FORMAT,
        `Found card with invalid structure (cardCode/name: ${ident})`
      );
    }

    if (parsed_card.collectible) {
      const region_refs = parsed_card.regionRefs;
      let regions: Region[];

      if (isRuneterran(region_refs)) {
        const origins = runeterranOrigin(parsed_card.name, region_refs);
        if (origins === null) {
          return makeErrStatus(
            StatusCode.MISSING_RUNETERRAN_CHAMP,
            `The Runeterran champion ${parsed_card.name} is not configured, please add a custom origin filter.`
          );
        }

        regions = origins;
      } else {
        regions = region_refs as Region[];
      }

      const card = {
        rarity: parsed_card.rarityRef,
        imageUrl: parsed_card.assets[0].gameAbsolutePath,
        fullImageUrl: parsed_card.assets[0].fullAbsolutePath,
        cost: parsed_card.cost,
        name: parsed_card.name,
        cardCode: parsed_card.cardCode,
        description: parsed_card.description.toLowerCase(),
        regions: regions,
        subtypes: parsed_card.subtypes.map((subtype) => subtype.toLowerCase()),
        keywords: parsed_card.keywordRefs,
        type: parsed_card.type,
        isStandard: parsed_card.formatRefs.includes(STANDARD_FORMAT_REF),
      };

      if (!CardT.guard(card as unknown)) {
        return makeErrStatus(
          StatusCode.INVALID_SET_PACK_FORMAT,
          `Found card with invalid structure in set pack (cardCode/name: ${card.cardCode})`
        );
      }

      cards.push(card);
    }
  }

  return makeOkStatus(cards);
}

export async function regionSets(): Promise<Status<RegionSetMap>> {
  if (g_region_sets !== undefined) {
    return makeOkStatus(g_region_sets);
  }

  const region_sets: RegionSetMap = allRegions().reduce<Partial<RegionSetMap>>(
    (region_sets, region) => ({
      ...region_sets,
      [region]: {
        champs: [],
        nonChamps: [],
      },
    }),
    {}
  ) as RegionSetMap;

  const set_packs_res = await Promise.all(
    SET_PACKS.map((set) => loadSetPack(set))
  );
  if (set_packs_res.some((set_pack) => !isOk(set_pack))) {
    return makeErrStatus(
      StatusCode.SET_PACK_UPDATE_ERROR,
      'Set pack update error',
      set_packs_res.filter((set_pack) => !isOk(set_pack)) as ErrStatusT[]
    );
  }
  const set_packs = set_packs_res.map(
    (set_pack) => (set_pack as OkStatusT<readonly Card[]>).value
  );

  set_packs.forEach((cards) => {
    cards.forEach((card) => {
      allRegions().forEach((region) => {
        if (regionContains(region, card)) {
          if (isChampion(card)) {
            (region_sets[region].champs as Card[]).push(card);
          } else {
            (region_sets[region].nonChamps as Card[]).push(card);
          }
        }
      });
    });
  });

  allRegions().forEach((region) => {
    if (region_sets[region].champs.length === 0) {
      console.warn(`No champs in region ${region}`);
    }
    if (region_sets[region].nonChamps.length === 0) {
      console.warn(`No non-champs in region ${region}`);
    }
  });

  g_region_sets = region_sets;
  return makeOkStatus(g_region_sets);
}
