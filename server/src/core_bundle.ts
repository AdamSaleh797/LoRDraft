import { allRegions, originRegions } from 'game/card'
import {
  GameMetadata,
  RegionMetadata,
  RegionRef,
  SetPackRegionMetadataT,
} from 'game/metadata'
import { isArray, keyInUnknown } from 'util/lor_util'
import {
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'util/status'

import { readBundle } from './bundle'

const g_core_bundle = 'globals-en_us.json'

let g_metadata: GameMetadata | undefined

export function gameMetadata(
  callback: (game_metadata: Status<GameMetadata>) => void = () => undefined
) {
  if (g_metadata !== undefined) {
    callback(makeOkStatus(g_metadata))
  }

  readBundle(g_core_bundle, (data: Status<string>) => {
    if (!isOk(data) || data === null) {
      callback(data)
      return
    }

    const obj = JSON.parse(data.value) as unknown
    if (!keyInUnknown(obj, 'regions')) {
      callback(
        makeErrStatus(
          StatusCode.INVALID_SET_PACK_FORMAT,
          'Core bundle missing key "regions"'
        )
      )
      return
    }

    const regions = obj.regions
    if (!isArray(regions)) {
      callback(
        makeErrStatus(
          StatusCode.INVALID_SET_PACK_FORMAT,
          'Core bundle "regions" entry is not an array'
        )
      )
      return
    }

    const region_metadata_builder: Partial<Record<RegionRef, RegionMetadata>> =
      {}

    if (
      regions.some((region) => {
        if (!SetPackRegionMetadataT.guard(region)) {
          let ident = '?'
          if (
            keyInUnknown(region, 'nameRef') &&
            typeof region.nameRef === 'string'
          ) {
            ident = region.nameRef
          }
          callback(
            makeErrStatus(
              StatusCode.INVALID_SET_PACK_FORMAT,
              `Region '${ident}' is either unknown or does not match ` +
                `expected format. Try updating the global list of regions ` +
                `if this region is new.`
            )
          )
          return true
        }

        region_metadata_builder[region.nameRef as RegionRef] = {
          abbreviation: region.abbreviation,
          imageUrl: region.iconAbsolutePath,
          name: region.nameRef as RegionRef,
        }
        return false
      })
    ) {
      // An error occurred while iterating over the parsed regions, which
      // already raised the error to `callback`.
      return
    }

    // Check that all regions are in the region metadata map.
    if (
      allRegions().some((region_abbreviation) => {
        return !(region_abbreviation in region_metadata_builder)
      })
    ) {
      callback(
        makeErrStatus(
          StatusCode.INVALID_SET_PACK_FORMAT,
          `Missing regions in core bundle: ${allRegions().filter(
            (region_abbreviation) => {
              return !(region_abbreviation in region_metadata_builder)
            }
          )}`
        )
      )
      return
    }

    const region_metadata: Record<RegionRef, RegionMetadata> =
      region_metadata_builder as Record<RegionRef, RegionMetadata>

    // For some reason, the icon URLs for non-main regions point to nothing,
    // so set them all to the runeterran region.
    originRegions().forEach((region_name) => {
      region_metadata[region_name].imageUrl =
        region_metadata['Runeterra'].imageUrl
    })

    const game_metadata = {
      regions: region_metadata_builder as Record<RegionRef, RegionMetadata>,
    }
    g_metadata = game_metadata
    callback(makeOkStatus(game_metadata))
  })
}
