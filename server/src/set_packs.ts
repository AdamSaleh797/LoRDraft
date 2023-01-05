import { Card, g_regions, Region, SetPackCard } from 'card'
import path from 'path'

import {
  downloadZipAsset,
  extractFromBundle,
  readBundle,
  removeBundle,
} from './bundle'
import bundles from './config/bundles.json'

type CallbackFn = (err: PromiseRejectedResult[] | null) => void

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

export function updateSetPacks(callback: CallbackFn = () => undefined) {
  console.log(bundles)
  const promiseList = bundles.map((bundle) => {
    return new Promise((resolve, reject) => {
      console.log(bundle.setName)
      downloadZipAsset(bundle.url, bundle.setName, (err) => {
        if (err) {
          reject(err)
          return
        }

        extractFromBundle(
          bundle.setName,
          bundle.configPath,
          path.basename(bundle.configPath),
          (err) => {
            if (err) {
              reject(err)
              return
            }
            removeBundle(bundle.setName, (err) => {
              if (err) {
                reject(err)
                return
              }
              resolve(0)
            })
          }
        )
      })
    })
  })

  Promise.allSettled(promiseList).then((results) => {
    const err_list = results.filter(
      (
        result: PromiseSettledResult<unknown>
      ): result is PromiseRejectedResult => result.status === 'rejected'
    )
    if (err_list.length !== 0) {
      callback(err_list)
    } else {
      callback(null)
    }
  })
}

export function loadSetPack(
  bundle: string,
  callback: (err: Error | null, cards: Card[] | null) => void = () => undefined
): void {
  readBundle(bundle, (err: Error | null, data: string | null) => {
    if (err || !data) {
      callback(err, null)
      return
    }
    const obj = JSON.parse(data)
    const cards: Card[] = []
    obj.forEach((card: SetPackCard) => {
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
    callback(null, cards)
  })
}

export function regionSets(
  callback: (err: Error | null, cards: RegionSetMap | null) => void
): void {
  if (g_region_sets !== undefined) {
    callback(null, g_region_sets)
    return
  }
  const region_sets: RegionSetMap = g_regions.reduce<Partial<RegionSetMap>>(
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

  Promise.all(
    g_set_packs.map((set) => {
      return new Promise<Card[]>((resolve, reject) => {
        loadSetPack(set, (err, cards) => {
          if (err || !cards) {
            reject(err)
            return
          }
          resolve(cards)
        })
      })
    })
  ).then(
    (set_packs) => {
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
      callback(null, g_region_sets)
    },
    (err) => {
      callback(err, null)
    }
  )
}
