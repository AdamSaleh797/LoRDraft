import {
  Array,
  Boolean,
  Literal,
  Number,
  Record,
  Static,
  String,
  Union,
} from 'runtypes'

const g_regions = [
  'Demacia',
  'Noxus',
  'Shurima',
  'PiltoverZaun',
  'Freljord',
  'Targon',
  'ShadowIsles',
  'BandleCity',
  'Runeterra',
  'Bilgewater',
  'Ionia',
] as const

export type Region = typeof g_regions[number]

const region_literals: Literal<Region>[] = g_regions.map((region) =>
  Literal(region)
)
export const RegionsT = Union(region_literals[0], ...region_literals.slice(1))

export function allRegions(): readonly Region[] {
  return g_regions
}

export const SetPackCardT = Record({
  associatedCards: Array(String),
  associatedCardRefs: Array(String),
  assets: Array(
    Record({
      gameAbsolutePath: String,
      fullAbsolutePath: String,
    })
  ),
  regions: Array(String),
  regionRefs: Array(RegionsT),
  attack: Number,
  cost: Number,
  health: Number,
  description: String,
  descriptionRaw: String,
  levelupDescription: String,
  levelupDescriptionRaw: String,
  flavorText: String,
  artistName: String,
  name: String,
  cardCode: String,
  keywords: Array(String),
  keywordRefs: Array(String),
  spellSpeed: String,
  spellSpeedRef: String,
  rarity: String,
  rarityRef: String,
  subtypes: Array(String),
  supertype: String,
  type: String,
  collectible: Boolean,
  set: String,
})

export type SetPackCard = Static<typeof SetPackCardT>

export interface Card {
  rarity: string
  imageUrl: string
  cost: number
  name: string
  regions: Region[]
  subtypes: string[]
}
