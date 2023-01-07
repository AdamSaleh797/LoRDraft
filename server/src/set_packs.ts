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
  OkStatusT,
  rejectedResults,
  Status,
  StatusCode,
} from 'lor_util'
import path from 'path'

import {
  downloadZipAsset,
  extractFromBundle,
  readBundle,
  removeBundle,
} from './bundle'
import bundles from './config/bundles.json'

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

export function updateSetPacks(
  callback: (rejected_results: PromiseRejectedResult[] | null) => void = () =>
    undefined
) {
  const promiseList = bundles.map((bundle) => {
    return new Promise(
      (
        resolve: (value: OkStatusT) => void,
        reject: (reason: ErrStatusT) => void
      ) => {
        downloadZipAsset(bundle.url, bundle.setName, (status) => {
          if (!isOk(status)) {
            reject(status)
            return
          }

          extractFromBundle(
            bundle.setName,
            bundle.configPath,
            path.basename(bundle.configPath),
            (status) => {
              if (!isOk(status)) {
                reject(status)
                return
              }

              removeBundle(bundle.setName, (status) => {
                if (!isOk(status)) {
                  reject(status)
                  return
                }
                resolve(status)
              })
            }
          )
        })
      }
    )
  })

  Promise.allSettled(promiseList).then((results) => {
    if (!allFullfilled(results)) {
      callback(rejectedResults(results))
    } else {
      callback(null)
    }
  })
}

export function loadSetPack(
  bundle: string,
  callback: (status: Status, cards: Card[] | null) => void = () => undefined
): void {
  readBundle(bundle, (status: Status, data: string | null) => {
    if (!isOk(status) || data === null) {
      callback(status, null)
      return
    }
    const obj = JSON.parse(data)
    const cards: Card[] = []
    obj.forEach((card: unknown) => {
      if (!SetPackCardT.guard(card)) {
        console.log(`Parse error, found card with invalid format.`)
        return
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
            return
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
        if (!CardT.guard(cards[cards.length - 1])) {
          console.log(cards[cards.length - 1])
        }
        CardT.check(cards[cards.length - 1])
      }
    })
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
