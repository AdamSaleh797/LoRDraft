import { allRegions, Card, Region, SetPackCardT } from 'card'
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
  champs: Card[]
  nonChamps: Card[]
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
        cards.push({
          rarity: card.rarity,
          imageUrl: card.assets[0].gameAbsolutePath,
          cost: card.cost,
          name: card.name,
          regions: card.regionRefs,
          subtypes: card.subtypes,
        })
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
          rejectedResults(set_pack_results)
            .map(
              (rejected_result) =>
                `${rejected_result.reason.status}: ${rejected_result.reason.message}`
            )
            .join(', ')
        ),
        null
      )
      return
    }

    const set_packs = set_pack_results.map((result) => result.value)

    set_packs.forEach((cards) => {
      cards.forEach((card) => {
        card.regions.forEach((region) => {
          if (card.rarity === 'Champion') {
            region_sets[region].champs.push(card)
          } else {
            region_sets[region].nonChamps.push(card)
          }
        })
      })
    })
    g_region_sets = region_sets
    callback(OkStatus, g_region_sets)
  })
}
