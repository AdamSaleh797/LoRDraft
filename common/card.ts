export const g_regions = [
  'Demacia',
  'Noxus',
  'Shurima',
  'PiltoverZaun',
  'Freljord',
  'Targon',
  'ShadowIsles',
  'BandleCity',
  'Runterra',
  'Bilgewater',
  'Ionia',
] as const

export type Region = typeof g_regions[number]

export interface Card {
  rarity: string
  imageUrl: string
  cost: number
  name: string
  regions: Region[]
  subtypes: string[]
}

export interface SetPackCard {
  associatedCards: string[]
  associatedCardRefs: string[]
  assets: [
    {
      gameAbsolutePath: string
      fullAbsolutePath: string
    }
  ]
  regions: string[]
  regionRefs: Region[]
  attack: number
  cost: number
  health: number
  description: string
  descriptionRaw: string
  levelupDescription: string
  levelupDescriptionRaw: string
  flavorText: string
  artistName: string
  name: string
  cardCode: string
  keywords: string[]
  keywordRefs: string[]
  spellSpeed: string
  spellSpeedRef: string
  rarity: string
  rarityRef: string
  subtypes: string[]
  supertype: string
  type: string
  collectible: boolean
  set: string
}
