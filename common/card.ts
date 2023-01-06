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

const g_main_regions = [
  'Demacia',
  'Noxus',
  'Shurima',
  'PiltoverZaun',
  'Freljord',
  'Targon',
  'ShadowIsles',
  'BandleCity',
  'Bilgewater',
  'Ionia',
] as const

export type MainRegion = typeof g_main_regions[number]
const main_region_literals = g_main_regions.map((region) => Literal(region))
export const MainRegionT = Union(
  main_region_literals[0],
  ...main_region_literals.slice(1)
)

const g_origins = {
  Evelynn: (card: Card): boolean => {
    return card.name === 'Evelynn'
  },
  Bard: (card: Card): boolean => {
    return card.name === 'Bard'
  },
  Jhin: (card: Card): boolean => {
    return card.name === 'Jhin'
  },
  Jax: (card: Card): boolean => {
    return card.subtypes.includes('weaponmaster')
  },
  Ryze: (card: Card): boolean => {
    return card.name === 'Ryze'
  },
  Kayn: (card: Card): boolean => {
    return card.name === 'Kayn'
  },
  Aatrox: (card: Card): boolean => {
    return card.name === 'Aatrox'
  },
  Varus: (card: Card): boolean => {
    return card.name === 'Varus'
  },
} as const

export type OriginsDef = {
  [champion in keyof typeof g_origins]: (card: Card) => boolean
}
// Assertion that g_origins satisfies its type
g_origins satisfies OriginsDef

export type Origin = keyof typeof g_origins
const origin_literals = Object.keys(g_origins).map((region) => Literal(region))
export const OriginT = Union(origin_literals[0], ...origin_literals.slice(1))

export const RegionT = Union(MainRegionT, OriginT)
export type Region = MainRegion | Origin

const g_all_regions: Region[] = [
  ...(g_main_regions as ReadonlyArray<Region>),
  ...(Object.keys(g_origins) as Region[]),
]

export function allRegions(): readonly Region[] {
  return g_all_regions
}

export function isMainRegion(region: string): region is MainRegion {
  return g_main_regions.includes(region as MainRegion)
}

export function isOrigin(region: string): region is Origin {
  return Object.keys(g_origins).includes(region as Origin)
}

export function isRuneterran(regions: string[]): boolean {
  return regions.includes('Runeterra')
}

export function runeterranOrigin(
  card_name: Origin,
  regions: string[]
): Region[] {
  return regions
    .filter((region) => region === 'Runeterra')
    .concat(card_name) as Region[]
}

export function regionContains(region: Region, card: Card) {
  if (isMainRegion(region)) {
    return card.regions.includes(region)
  } else {
    return g_origins[region](card)
  }
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
  regionRefs: Array(Union(RegionT, Literal('Runeterra'))),
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

export function filterRegions(regions: (Region | 'Runeterra')[]): Region[] {
  return regions.filter((region) => region !== 'Runeterra') as Region[]
}

export const CardT = Record({
  rarity: String,
  imageUrl: String,
  cost: Number,
  name: String,
  cardCode: String,
  regions: Array(RegionT),
  subtypes: Array(String),
})

// export type Card = Static<typeof CardT>
export interface Card {
  rarity: string
  imageUrl: string
  cost: number
  name: string
  cardCode: string
  regions: Region[]
  subtypes: string[]
}
