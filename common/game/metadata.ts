import { Literal, Record as RecordT, String, Union } from 'runtypes'

import { RUNETERRA, Region, RegionT } from 'common/game/card'
import { MapTypeValues } from 'common/util/lor_util'

// A mapping from the draft format name ref found in the core config file to
// the colliquial name, which we also use internally as the name ref.
const g_draft_format_refs = {
  client_Formats_Standard_name: 'Standard',
  client_Formats_Eternal_name: 'Eternal',
} as const

const g_draft_format_ref_literals = Object.keys(g_draft_format_refs).map(
  (format) => Literal(format)
)
export const DraftFormatRefT = Union(
  g_draft_format_ref_literals[0],
  ...g_draft_format_ref_literals.slice(1)
)
export type DraftFormatRef = keyof typeof g_draft_format_refs

export const SetPackDraftFormatMetadataT = RecordT({
  iconAbsolutePath: String,
  name: String,
  nameRef: DraftFormatRefT,
})

const g_draft_format_literals = Object.values(g_draft_format_refs).map(
  (format) => Literal(format)
)
export const DraftFormatT = Union(
  g_draft_format_literals[0],
  ...g_draft_format_literals.slice(1)
)

export type DraftFormat = MapTypeValues<typeof g_draft_format_refs>

export interface DraftFormatMetadata {
  name: DraftFormat
  imageUrl: string
}

export function allDraftFormats(): readonly DraftFormat[] {
  return Object.values(g_draft_format_refs) as DraftFormat[]
}

export function draftFormatRefToName(format_ref: DraftFormatRef): DraftFormat {
  return g_draft_format_refs[format_ref]
}

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
  formats: Record<DraftFormat, DraftFormatMetadata>
}
