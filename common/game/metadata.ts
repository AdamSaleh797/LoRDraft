import { Literal, Record as RecordT, String, Union } from 'runtypes'

import { RUNETERRA, Region, RegionT } from 'common/game/card'
import { MapTypeValues } from 'common/util/lor_util'

// A mapping from the draft format name ref found in the core config file to
// the colliquial name, which we also use internally as the name ref.
const DRAFT_FORMAT_REFS = {
  /* eslint-disable @typescript-eslint/naming-convention */
  client_Formats_Standard_name: 'Standard',
  client_Formats_Eternal_name: 'Eternal',
  /* eslint-enable @typescript-eslint/naming-convention */
} as const

const DRAFT_FORMAT_REF_LITERALS = Object.keys(DRAFT_FORMAT_REFS).map((format) =>
  Literal(format)
)
export const DraftFormatRefT = Union(
  DRAFT_FORMAT_REF_LITERALS[0],
  ...DRAFT_FORMAT_REF_LITERALS.slice(1)
)
export type DraftFormatRef = keyof typeof DRAFT_FORMAT_REFS

export const SetPackDraftFormatMetadataT = RecordT({
  /* eslint-disable @typescript-eslint/naming-convention */
  iconAbsolutePath: String,
  name: String,
  nameRef: DraftFormatRefT,
  /* eslint-enable @typescript-eslint/naming-convention */
})

const DRAFT_FORMAT_LITERALS = Object.values(DRAFT_FORMAT_REFS).map((format) =>
  Literal(format)
)
export const DraftFormatT = Union(
  DRAFT_FORMAT_LITERALS[0],
  ...DRAFT_FORMAT_LITERALS.slice(1)
)

export type DraftFormat = MapTypeValues<typeof DRAFT_FORMAT_REFS>

export interface DraftFormatMetadata {
  name: DraftFormat
  imageUrl: string
}

export function allDraftFormats(): readonly DraftFormat[] {
  return Object.values(DRAFT_FORMAT_REFS) as DraftFormat[]
}

export function draftFormatRefToName(format_ref: DraftFormatRef): DraftFormat {
  return DRAFT_FORMAT_REFS[format_ref]
}

const REGION_ABBREVIATIONS = [
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
  return REGION_ABBREVIATIONS
}

const REGION_ABBREVIATION_LITERALS = REGION_ABBREVIATIONS.map((region) =>
  Literal(region)
)
export const RegionAbbreviationT = Union(
  REGION_ABBREVIATION_LITERALS[0],
  ...REGION_ABBREVIATION_LITERALS.slice(1)
)

export type RegionAbbreviation = (typeof REGION_ABBREVIATIONS)[number]

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
