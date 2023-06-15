import { allRegions, originRegions } from 'common/game/card'
import {
  DraftFormat,
  DraftFormatMetadata,
  DraftFormatRef,
  GameMetadata,
  RegionMetadata,
  RegionRef,
  SetPackDraftFormatMetadataT,
  SetPackRegionMetadataT,
  allDraftFormats,
  draftFormatRefToName,
} from 'common/game/metadata'
import { isArray, keyInUnknown } from 'common/util/lor_util'
import {
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status'

import { readBundle } from 'server/bundle'

const CORE_BUNDLE_FILENAME = 'globals-en_us.json'

let g_metadata: GameMetadata | undefined

function parseRegionsMetadata(
  data: unknown
): Status<Record<RegionRef, RegionMetadata>> {
  if (!keyInUnknown(data, 'regions')) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      'Core bundle missing key "regions"'
    )
  }

  const regions = data.regions
  if (!isArray(regions)) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      'Core bundle "regions" entry is not an array'
    )
  }

  const region_metadata_builder: Partial<Record<RegionRef, RegionMetadata>> = {}

  for (const region of regions) {
    if (!SetPackRegionMetadataT.guard(region)) {
      let ident = '?'
      if (
        keyInUnknown(region, 'nameRef') &&
        typeof region.nameRef === 'string'
      ) {
        ident = region.nameRef
      }
      return makeErrStatus(
        StatusCode.INVALID_SET_PACK_FORMAT,
        `Region '${ident}' is either unknown or does not match ` +
          `expected format. Try updating the global list of regions ` +
          `if this region is new.`
      )
    }

    region_metadata_builder[region.nameRef as RegionRef] = {
      abbreviation: region.abbreviation,
      imageUrl: region.iconAbsolutePath,
      name: region.nameRef as RegionRef,
    }
  }

  // Check that all regions are in the region metadata map.
  if (
    allRegions().some((region_abbreviation) => {
      return !(region_abbreviation in region_metadata_builder)
    })
  ) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      `Missing regions in core bundle: ${allRegions().filter(
        (region_abbreviation) => {
          return !(region_abbreviation in region_metadata_builder)
        }
      )}`
    )
  }

  const region_metadata: Record<RegionRef, RegionMetadata> =
    region_metadata_builder as Record<RegionRef, RegionMetadata>

  // For some reason, the icon URLs for non-main regions point to nothing,
  // so set them all to the runeterran region.
  originRegions().forEach((region_name) => {
    region_metadata[region_name].imageUrl = region_metadata.Runeterra.imageUrl
  })

  return makeOkStatus(region_metadata)
}

function parseFormatsMetadata(
  data: unknown
): Status<Record<DraftFormat, DraftFormatMetadata>> {
  if (!keyInUnknown(data, 'formats')) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      'Core bundle missing key "formats"'
    )
  }

  const formats = data.formats
  if (!isArray(formats)) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      'Core bundle "formats" entry is not an array'
    )
  }

  const format_metadata_builder: Partial<
    Record<DraftFormat, DraftFormatMetadata>
  > = {}

  for (const format of formats) {
    if (!SetPackDraftFormatMetadataT.guard(format)) {
      // Ignore unknown formats
      continue
    }

    const name = draftFormatRefToName(format.nameRef as DraftFormatRef)

    format_metadata_builder[name] = {
      imageUrl: format.iconAbsolutePath,
      name: name,
    }
  }

  // Check that all formats are in the formats metadata map.
  if (
    allDraftFormats().some((format) => {
      return !(format in format_metadata_builder)
    })
  ) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      `Missing formats in core bundle: ${allDraftFormats().filter((format) => {
        return !(format in format_metadata_builder)
      })}`
    )
  }

  const format_metadata: Record<DraftFormat, DraftFormatMetadata> =
    format_metadata_builder as Record<DraftFormat, DraftFormatMetadata>

  return makeOkStatus(format_metadata)
}

export function gameMetadata(
  callback: (game_metadata: Status<GameMetadata>) => void = () => undefined
) {
  if (g_metadata !== undefined) {
    callback(makeOkStatus(g_metadata))
    return
  }

  readBundle(CORE_BUNDLE_FILENAME, (data: Status<string>) => {
    if (!isOk(data)) {
      callback(data)
      return
    }

    const obj = JSON.parse(data.value) as unknown

    const regions = parseRegionsMetadata(obj)
    if (!isOk(regions)) {
      callback(regions)
      return
    }

    const formats = parseFormatsMetadata(obj)
    if (!isOk(formats)) {
      callback(formats)
      return
    }

    const game_metadata = {
      regions: regions.value,
      formats: formats.value,
    }
    g_metadata = game_metadata
    callback(makeOkStatus(game_metadata))
  })
}
