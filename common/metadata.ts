import { Region, RegionT, RUNETERRA } from 'card'
import { Literal, Record as RecordT, String, Union } from 'runtypes'

const g_region_abbreviations = [
  'NX',
  'RYZE',
  'Jhin',
  'Varus',
  'Aatrox',
  'Jax',
  'Kayn',
  'Evelynn',
  'Bard',
  'DE',
  'RU',
  'FR',
  'SI',
  'MT',
  'IO',
  'SH',
  'BW',
  'PZ',
  'BC',
] as const

export function allRegionAbbreviations(): readonly RegionAbbreviation[] {
  return g_region_abbreviations
}

const g_region_abbreviation_literals = g_region_abbreviations.map((region) =>
  Literal(region)
)
export const RegionAbbreviationT = Union(
  g_region_abbreviation_literals[0],
  ...g_region_abbreviation_literals.slice(1)
)

export type RegionAbbreviation = (typeof g_region_abbreviations)[number]

export const SetPackRegionMetadataT = RecordT({
  abbreviation: RegionAbbreviationT,
  iconAbsolutePath: String,
  name: String,
  nameRef: Union(RegionT, Literal(RUNETERRA)),
})

export type RegionRef = Region | 'Runeterra'

export interface RegionMetadata {
  abbreviation: RegionAbbreviation
  imageUrl: string
  name: RegionRef
}

export interface GameMetadata {
  regions: Record<RegionRef, RegionMetadata>
}
