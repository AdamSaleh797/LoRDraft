import {
  allRegions,
  Card,
  CardT,
  isChampion,
  isOrigin,
  isRuneterran,
  Region,
  regionContains,
  runeterranOrigin,
  SetPackCardT,
} from 'card'
import {
  allFullfilled,
  ErrStatusT,
  isOk,
  makeErrStatus,
  OkStatus,
  rejectedResults,
  Status,
  StatusCode,
} from 'lor_util'

import { readBundle } from './bundle'

interface RegionSet {
  champs: readonly Card[]
  nonChamps: readonly Card[]
}
type RegionSetMap = Record<Region, RegionSet>

const g_set_packs = [
  'set1-en_us.json',
  'set2-en_us.json',
  'set3-en_us.json',
  'set4-en_us.json',
  'set5-en_us.json',
  'set6-en_us.json',
  'set6cde-en_us.json',
]

let g_region_sets: RegionSetMap | undefined

function loadSetPack(
  bundle: string,
  callback: (status: Status, cards: Card[] | null) => void = () => undefined
): void {
  readBundle(bundle, (status: Status, data: string | null) => {
    if (!isOk(status) || data === null) {
      callback(status, null)
      return
    }
    const obj = JSON.parse(data) as any[]
    const cards: Card[] = []
    if (
      obj.some((parsed_card: any) => {
        if (!SetPackCardT.guard(parsed_card)) {
          callback(
            makeErrStatus(
              StatusCode.INVALID_SET_PACK_FORMAT,
              `Found card with invalid structure (cardCode/name: ${
                parsed_card?.cardCode ?? parsed_card?.name
              })`
            ),
            null
          )
          return true
        }

        if (parsed_card.collectible) {
          const regionRefs = parsed_card.regionRefs
          let regions: Region[]

          if (isRuneterran(regionRefs)) {
            if (!isOrigin(parsed_card.name)) {
              callback(
                makeErrStatus(
                  StatusCode.MISSING_RUNETERRAN_CHAMP,
                  `The Runeterran champion ${parsed_card.name} is not configured, please add a custom origin filter.`
                ),
                null
              )
              return true
            }

            regions = runeterranOrigin(parsed_card.name, regionRefs)
          } else {
            regions = regionRefs as Region[]
          }

          const card = {
            rarity: parsed_card.rarityRef,
            imageUrl: parsed_card.assets[0].gameAbsolutePath,
            cost: parsed_card.cost,
            name: parsed_card.name,
            cardCode: parsed_card.cardCode,
            description: parsed_card.description.toLowerCase(),
            regions: regions,
            subtypes: parsed_card.subtypes.map((subtype) =>
              subtype.toLowerCase()
            ),
            keywords: parsed_card.keywordRefs,
            type: parsed_card.type.toLowerCase(),
          }

          if (!CardT.guard(card as any)) {
            callback(
              makeErrStatus(
                StatusCode.INVALID_SET_PACK_FORMAT,
                `Found card with invalid structure in set pack (cardCode/name: ${
                  card.cardCode ?? card.name
                })`
              ),
              null
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
    callback(status, cards)
  })
}

export function regionSets(
  callback: (status: Status, cards: RegionSetMap | null) => void
): void {
  if (g_region_sets !== undefined) {
    callback(OkStatus, g_region_sets)
    return
  }

  const region_sets: RegionSetMap = allRegions().reduce<Partial<RegionSetMap>>(
    (region_sets, region) => {
      return {
        ...region_sets,
        [region]: {
          champs: [],
          nonChamps: [],
        },
      }
    },
    {}
  ) as RegionSetMap

  Promise.allSettled(
    g_set_packs.map((set) => {
      return new Promise<Card[]>((resolve, reject) => {
        loadSetPack(set, (status, cards) => {
          if (!isOk(status) || cards === null) {
            reject(status)
            return
          }
          resolve(cards)
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
        ),
        null
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
    callback(OkStatus, g_region_sets)
  })
}
