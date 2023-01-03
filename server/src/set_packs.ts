import { Card, SetPackCard } from 'card'
import path from 'path'

import {
  downloadZipAsset,
  extractFromBundle,
  readBundle,
  removeBundle,
} from './bundle'
import bundles from './config/bundles.json'

type callback_fn = (err: PromiseRejectedResult[] | null) => void

const g_set_packs = [
  'set1-en_us.json',
  'set2-en_us.json',
  'set3-en_us.json',
  'set4-en_us.json',
  'set5-en_us.json',
  'set6-en_us.json',
  'set6cde-en_us.json',
]

let g_cards: Card[] | undefined

export function updateSetPacks(callback: callback_fn = () => undefined) {
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
      cards.push({
        rarity: card.rarity,
        imageUrl: card.assets[0].gameAbsolutePath,
        cost: card.cost,
        name: card.name,
        regions: card.regions,
        subtypes: card.subtypes,
        cardCode: card.cardCode
      })
    })
    callback(null, cards)
  })
}

export function allCards(
  callback: (err: Error | null, cards: Card[] | null) => void
): void {
  if (g_cards !== undefined) {
    callback(null, g_cards)
    return
  }

  Promise.all(
    g_set_packs.map((set) => {
      return new Promise<Card[]>((resolve, reject) => {
        loadSetPack(set, (err, cards) => {
          if (err || !cards) {
            reject(err)
            return
          }
          resolve(cards.filter((card) => isCollectable(card)))
        })
      })
    })
  ).then(
    (cards) => {
      g_cards = cards.flat(1)
      callback(null, g_cards)
    },
    (err) => {
      callback(err, null)
    }
  )
}

export function isCollectable(card: Card) {
  return card.rarity.toUpperCase() !== 'NONE'
}
