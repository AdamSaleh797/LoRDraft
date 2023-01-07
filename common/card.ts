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

// burst/focus speed spell cards that do not say
// prettier-ignore
const ryzeOrigin = [
  '01DE019', '01DE017', '01DE027', '02DE007', '04DE012', '06DE042',
  '06DE030', '06DE026', '06DE040', '01NX039', '04NX002', '06NX037',
  '04SH035', '04SH120', '04SH099', '04SH037', '04SH083', '04SH092',
  '04SH110', '04SH106', '05SH018', '05SH020', '06SH048', '06SH042',
  '06SH050', '06SH049', '01PZ028', '01PZ010', '01PZ049', '01PZ016',
  '02PZ009', '03PZ014', '03PZ025', '04PZ007', '05PZ010', '05PZ030',
  '06PZ032', '06PZ043', '06PZ027', '06PZ006', '06PZ022', '01FR029',
  '01FR016', '01FR012', '02FR010', '02FR003', '03FR018', '03FR019',
  '04FR017', '04FR010', '05FR016', '06FR034', '06FR032', '03MT015',
  '03MT042', '03MT091', '03MT017', '03MT215', '03MT003', '03MT218',
  '04MT006', '04MT015', '06MT045', '06MT043', '02SI005', '02SI009',
  '03SI004', '03SI014', '03SI007', '03SI013', '06SI037', '06SI030',
  '05BC223', '05BC026', '05BC218', '05BC217', '05BC040', '06BC045',
  '06BC040', '06BC043', '06BC017', '06BC011', '06BC032', '02BW023',
  '02BW029', '02BW049', '02BW020', '02BW044', '04BW014', '04BW008',
  '04BW004', '06BW030', '06BW037', '06BW041', '06BW043', '06BW039',
  '01IO029', '01IO054', '02IO009', '05IO006', '06IO036'
]

export type MainRegion = typeof g_main_regions[number]
const main_region_literals = g_main_regions.map((region) => Literal(region))
export const MainRegionT = Union(
  main_region_literals[0],
  ...main_region_literals.slice(1)
)

const g_origins = {
  Evelynn: (card: Card): boolean => {
    return card.description.includes('husk') || card.cardCode === '06RU025'
  },
  Bard: (card: Card): boolean => {
    return (
      card.description.includes('link=card.chime') ||
      card.cardCode === '06RU001'
    )
  },
  Jhin: (card: Card): boolean => {
    return (
      card.description.includes('attackskill') ||
      card.description.includes('playskill') ||
      card.cardCode == '06RU002'
    )
  },
  Jax: (card: Card): boolean => {
    return card.subtypes.includes('weaponmaster') || card.cardCode === '06RU008'
  },
  Ryze: (card: Card): boolean => {
    return ryzeOrigin.includes(card.cardCode) || card.cardCode === '06RU006'
  },
  Kayn: (card: Card): boolean => {
    return card.subtypes.includes('cultist') || card.cardCode === '06RU005'
  },
  Aatrox: (card: Card): boolean => {
    return (
      (card.subtypes.includes('darkin') && card.rarity !== 'Champion') ||
      card.cardCode === '06RU026'
    )
  },
  Varus: (card: Card): boolean => {
    return card.subtypes.includes('cultist') || card.cardCode === '06RU009'
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
    .filter((region) => region !== 'Runeterra')
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
  description: String,
  regions: Array(RegionT),
  subtypes: Array(String),
  keywords: Array(String),
  type: String,
})

// export type Card = Static<typeof CardT>
export interface Card {
  rarity: string
  imageUrl: string
  cost: number
  name: string
  cardCode: string
  description: string
  regions: Region[]
  subtypes: string[]
  keywords: string[]
  type: string
}
