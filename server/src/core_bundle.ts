import { readBundle } from './bundle'
import {
  isArray,
  isOk,
  keyInUnknown,
  makeErrStatus,
  makeOkStatus,
  Status,
  StatusCode,
} from 'lor_util'
import {
  GameMetadata,
  RegionMetadata,
  RegionRef,
  SetPackRegionMetadataT,
} from 'metadata'
import { allRegions } from 'card'

const g_core_bundle = 'globals-en_us.json'

let g_metadata: GameMetadata | undefined

export function gameMetadata(
  callback: (game_metadata: Status<GameMetadata>) => void = () => undefined
) {
  if (g_metadata !== undefined) {
    return g_metadata
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

    const region_metadata: Partial<Record<RegionRef, RegionMetadata>> = {}

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

        region_metadata[region.nameRef as RegionRef] = {
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
        return !(region_abbreviation in region_metadata)
      })
    ) {
      callback(
        makeErrStatus(
          StatusCode.INVALID_SET_PACK_FORMAT,
          `Missing regions in core bundle: ${allRegions().filter(
            (region_abbreviation) => {
              return !(region_abbreviation in region_metadata)
            }
          )}`
        )
      )
      return
    }

    const game_metadata = {
      regions: region_metadata as Record<RegionRef, RegionMetadata>,
    }
    g_metadata = game_metadata
    callback(makeOkStatus(game_metadata))
  })
}
