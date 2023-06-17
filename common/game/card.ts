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

export const MAX_CARD_COPIES = 3

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Champion' | 'None'

const CardTypeT = Union(
  Literal('Spell'),
  Literal('Unit'),
  Literal('Equipment'),
  Literal('Landmark'),
  Literal('Trap'),
  Literal('Ability')
)

export type CardType = Static<typeof CardTypeT>

export const RUNETERRA = 'Runeterra' as const

const MAIN_REGIONS = [
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
const RYZE_ORIGIN = [
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

export type MainRegion = (typeof MAIN_REGIONS)[number]
const MAIN_REGION_LITERALS = MAIN_REGIONS.map((region) => Literal(region))
export const MainRegionT = Union(
  MAIN_REGION_LITERALS[0],
  ...MAIN_REGION_LITERALS.slice(1)
)

export const STANDARD_FORMAT_REF = 'client_Formats_Standard_name'
export const ETERNAL_FORMAT_REF = 'client_Formats_Standard_name'

const ORIGINS = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Evelynn: (card: Card): boolean => {
    return (
      (card.description.includes('husk') && !isChampion(card)) ||
      card.cardCode === '06RU025'
    )
  },
  Bard: (card: Card): boolean => {
    return (
      (card.description.includes('link=card.chime') && !isChampion(card)) ||
      card.cardCode === '06RU001'
    )
  },
  Jhin: (card: Card): boolean => {
    return (
      ((card.description.includes('attackskill') ||
        card.description.includes('playskill')) &&
        !isChampion(card)) ||
      card.cardCode === '06RU002'
    )
  },
  Jax: (card: Card): boolean => {
    return (
      (card.subtypes.includes('weaponmaster') && !isChampion(card)) ||
      card.cardCode === '06RU008'
    )
  },
  Ryze: (card: Card): boolean => {
    return RYZE_ORIGIN.includes(card.cardCode) || card.cardCode === '06RU006'
  },
  Kayn: (card: Card): boolean => {
    return (
      (card.subtypes.includes('cultist') && !isChampion(card)) ||
      card.cardCode === '06RU005'
    )
  },
  Aatrox: (card: Card): boolean => {
    return (
      (card.subtypes.includes('darkin') && !isChampion(card)) ||
      card.cardCode === '06RU026'
    )
  },
  Varus: (card: Card): boolean => {
    return (
      (card.subtypes.includes('cultist') && !isChampion(card)) ||
      card.cardCode === '06RU009'
    )
  },
  /* eslint-enable @typescript-eslint/naming-convention */
} as const

export type OriginsDef = {
  [champion in keyof typeof ORIGINS]: (card: Card) => boolean
}
// Assertion that g_origins satisfies its type
ORIGINS satisfies OriginsDef

export type Origin = keyof typeof ORIGINS
const ORIGIN_LITERALS = Object.keys(ORIGINS).map((region) => Literal(region))
export const OriginT = Union(ORIGIN_LITERALS[0], ...ORIGIN_LITERALS.slice(1))

export const RegionT = Union(MainRegionT, OriginT)
export type Region = MainRegion | Origin

const ALL_REGIONS: Region[] = [
  ...(MAIN_REGIONS as ReadonlyArray<Region>),
  ...(Object.keys(ORIGINS) as Region[]),
]

export function mainRegions(): readonly MainRegion[] {
  return MAIN_REGIONS
}

export function originRegions(): readonly Origin[] {
  return Object.keys(ORIGINS) as Origin[]
}

export function allRegions(): Region[] {
  return ALL_REGIONS
}

export function isMainRegion(region: string): region is MainRegion {
  return MAIN_REGIONS.includes(region as MainRegion)
}

export function isOrigin(region: string): region is Origin {
  return Object.keys(ORIGINS).includes(region as Origin)
}

export function isRuneterran(regions: readonly string[]): boolean {
  return regions.includes(RUNETERRA)
}

export function runeterranOrigin(
  card_name: Origin,
  regions: readonly string[]
): Region[] {
  const origins = regions.filter((region) => region !== RUNETERRA)
  if (!origins.includes(card_name)) {
    origins.push(card_name)
  }
  return origins as Region[]
}

export function regionContains(region: Region, card: Card) {
  if (isMainRegion(region)) {
    return card.regions.includes(region)
  } else {
    return ORIGINS[region](card)
  }
}

export const CardCodeT = String
export type CardCode = Static<typeof CardCodeT>

export const SetPackCardT = Record({
  /* eslint-disable @typescript-eslint/naming-convention */
  associatedCards: Array(String),
  associatedCardRefs: Array(String),
  assets: Array(
    Record({
      gameAbsolutePath: String,
      fullAbsolutePath: String,
    })
  ),
  regions: Array(String),
  regionRefs: Array(Union(MainRegionT, Literal(RUNETERRA))),
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
  cardCode: CardCodeT,
  keywords: Array(String),
  keywordRefs: Array(String),
  spellSpeed: String,
  spellSpeedRef: String,
  rarity: String,
  rarityRef: Union(
    Literal('Common'),
    Literal('Rare'),
    Literal('Epic'),
    Literal('Champion'),
    Literal('None')
  ),
  subtypes: Array(String),
  supertype: String,
  type: CardTypeT,
  collectible: Boolean,
  set: String,
  formats: Array(String),
  formatRefs: Array(String),
  /* eslint-enable @typescript-eslint/naming-convention */
})

export type SetPackCard = Static<typeof SetPackCardT>

export function filterRegions(
  regions: (Region | typeof RUNETERRA)[]
): Region[] {
  return regions.filter((region) => region !== RUNETERRA) as Region[]
}

export const CardT = Record({
  rarity: Union(
    Literal('Common'),
    Literal('Rare'),
    Literal('Epic'),
    Literal('Champion'),
    Literal('None')
  ),
  imageUrl: String,
  fullImageUrl: String,
  cost: Number,
  name: String,
  cardCode: CardCodeT,
  description: String,
  regions: Array(RegionT),
  subtypes: Array(String),
  keywords: Array(String),
  type: CardTypeT,
  isStandard: Boolean,
})

// export type Card = Static<typeof CardT>
export interface Card {
  rarity: Rarity
  imageUrl: string
  fullImageUrl: string
  cost: number
  name: string
  cardCode: CardCode
  description: string
  regions: Region[]
  subtypes: string[]
  keywords: string[]
  type: CardType
  isStandard: boolean
}

export function isChampion(card: Card): boolean {
  return card.rarity === 'Champion'
}

export function cardComparator(card1: Card, card2: Card): boolean {
  return card1.cardCode === card2.cardCode
}
