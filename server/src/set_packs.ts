import {
  allRegions,
  Card,
  CardT,
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
  MakeErrStatus,
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
      obj.some((card: any) => {
        if (!SetPackCardT.guard(card)) {
          callback(
            MakeErrStatus(
              StatusCode.INVALID_SET_PACK_FORMAT,
              `Found card with invalid structure (cardCode/name: ${
                card?.cardCode ?? card?.name
              })`
            ),
            null
          )
          return true
        }

        if (card.collectible) {
          const regionRefs = card.regionRefs
          let regions: Region[]

          if (isRuneterran(regionRefs)) {
            if (!isOrigin(card.name)) {
              callback(
                MakeErrStatus(
                  StatusCode.MISSING_RUNETERRAN_CHAMP,
                  `The Runeterran champion ${card.name} is not configured, please add a custom origin filter.`
                ),
                null
              )
              return true
            }

            regions = runeterranOrigin(card.name, regionRefs)
          } else {
            regions = regionRefs as Region[]
          }

          cards.push({
            rarity: card.rarityRef,
            imageUrl: card.assets[0].gameAbsolutePath,
            cost: card.cost,
            name: card.name,
            cardCode: card.cardCode,
            description: card.description.toLowerCase(),
            regions: regions,
            subtypes: card.subtypes.map((subtype) => subtype.toLowerCase()),
            keywords: card.keywordRefs,
            type: card.type.toLowerCase(),
          })

          if (!CardT.guard(cards.at(-1))) {
            callback(
              MakeErrStatus(
                StatusCode.INVALID_SET_PACK_FORMAT,
                `Found card with invalid structure in set pack (cardCode/name: ${
                  cards.at(-1)?.cardCode ?? cards.at(-1)?.name
                })`
              ),
              null
            )
            return true
          }
        }

        return false
      })
    ) {
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
        MakeErrStatus(
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
            if (card.rarity === 'Champion') {
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
