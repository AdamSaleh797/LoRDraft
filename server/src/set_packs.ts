import {
  Card,
  CardT,
  Region,
  STANDARD_FORMAT_REF,
  SetPackCardT,
  allRegions,
  isChampion,
  isOrigin,
  isRuneterran,
  regionContains,
  runeterranOrigin,
} from 'common/game/card'
import {
  allFullfilled,
  keyInUnknown,
  rejectedResults,
} from 'common/util/lor_util'
import {
  ErrStatusT,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status'

import { readBundle } from 'server/bundle'

interface RegionSet {
  champs: readonly Card[]
  nonChamps: readonly Card[]
}
type RegionSetMap = Record<Region, RegionSet>

const SET_PACKS = [
  'set1-en_us.json',
  'set2-en_us.json',
  'set3-en_us.json',
  'set4-en_us.json',
  'set5-en_us.json',
  'set6-en_us.json',
  'set6cde-en_us.json',
  'set7-en_us.json',
]

let g_region_sets: RegionSetMap | undefined

function loadSetPack(
  bundle: string,
  callback: (cards: Status<readonly Card[]>) => void = () => undefined
): void {
  readBundle(bundle, (data: Status<string>) => {
    if (!isOk(data)) {
      callback(data)
      return
    }
    const obj = JSON.parse(data.value) as unknown[]
    const cards: Card[] = []
    if (
      obj.some((parsed_card: unknown) => {
        if (!SetPackCardT.guard(parsed_card)) {
          let ident = '?'
          if (
            keyInUnknown(parsed_card, 'cardCode') &&
            typeof parsed_card.cardCode === 'string'
          ) {
            ident = parsed_card.cardCode
          } else if (
            keyInUnknown(parsed_card, 'name') &&
            typeof parsed_card.name === 'string'
          ) {
            ident = parsed_card.name
          }

          callback(
            makeErrStatus(
              StatusCode.INVALID_SET_PACK_FORMAT,
              `Found card with invalid structure (cardCode/name: ${ident})`
            )
          )
          return true
        }

        if (parsed_card.collectible) {
          const region_refs = parsed_card.regionRefs
          let regions: Region[]

          if (isRuneterran(region_refs)) {
            if (!isOrigin(parsed_card.name)) {
              callback(
                makeErrStatus(
                  StatusCode.MISSING_RUNETERRAN_CHAMP,
                  `The Runeterran champion ${parsed_card.name} is not configured, please add a custom origin filter.`
                )
              )
              return true
            }

            regions = runeterranOrigin(parsed_card.name, region_refs)
          } else {
            regions = region_refs as Region[]
          }

          const card = {
            rarity: parsed_card.rarityRef,
            imageUrl: parsed_card.assets[0].gameAbsolutePath,
            fullImageUrl: parsed_card.assets[0].fullAbsolutePath,
            cost: parsed_card.cost,
            name: parsed_card.name,
            cardCode: parsed_card.cardCode,
            description: parsed_card.descriptionRaw.toLowerCase(),
            regions: regions,
            subtypes: parsed_card.subtypes.map((subtype) =>
              subtype.toLowerCase()
            ),
            keywords: parsed_card.keywordRefs,
            type: parsed_card.type,
            isStandard: parsed_card.formatRefs.includes(STANDARD_FORMAT_REF),
          }

          if (!CardT.guard(card as unknown)) {
            callback(
              makeErrStatus(
                StatusCode.INVALID_SET_PACK_FORMAT,
                `Found card with invalid structure in set pack (cardCode/name: ${card.cardCode})`
              )
            )
            return true
          }

          cards.push(card)
        }

        return false
      })
    ) {
      // An error occurred while iterating over the parsed cards, which already
      // raised the error to `callback`.
      return
    }
    callback(makeOkStatus(cards))
  })
}

export function regionSets(
  callback: (cards: Status<RegionSetMap>) => void
): void {
  if (g_region_sets !== undefined) {
    callback(makeOkStatus(g_region_sets))
    return
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
  ) as RegionSetMap

  Promise.allSettled(
    SET_PACKS.map((set) => {
      return new Promise<readonly Card[]>((resolve, reject) => {
        loadSetPack(set, (status) => {
          if (!isOk(status)) {
            reject(status)
            return
          }
          resolve(status.value)
        })
      })
    })
  ).then((set_pack_results) => {
    if (!allFullfilled(set_pack_results)) {
      callback(
        makeErrStatus(
          StatusCode.SET_PACK_UPDATE_ERROR,
          'Set pack update error',
          rejectedResults(set_pack_results).map(
            (rejected_result) => rejected_result.reason as ErrStatusT
          )
        )
      )
      return
    }

    const set_packs = set_pack_results.map((result) => result.value)

    set_packs.forEach((cards) => {
      cards.forEach((card) => {
        allRegions().forEach((region) => {
          if (regionContains(region, card)) {
            if (isChampion(card)) {
              // prettier-ignore
              (region_sets[region].champs as Card[]).push(card)
            } else {
              // prettier-ignore
              (region_sets[region].nonChamps as Card[]).push(card)
            }
          }
        })
      })
    })
    g_region_sets = region_sets
    callback(makeOkStatus(g_region_sets))
  })
}
