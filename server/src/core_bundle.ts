import { allRegions, originRegions } from 'common/game/card';
import {
  DraftFormat,
  DraftFormatMetadata,
  DraftFormatRef,
  GameMetadata,
  OfficialDraftFormat,
  RegionMetadata,
  RegionRef,
  SetPackDraftFormatMetadataT,
  SetPackRegionMetadataT,
  allDraftFormats,
  officialDraftFormatRefToName,
  officialDraftFormats,
  unofficialFormatMetadata,
} from 'common/game/metadata';
import { isArray, keyInUnknown } from 'common/util/lor_util';
import {
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status';

import { readBundle } from 'server/bundle';

const CORE_BUNDLE_FILENAME = 'globals-en_us.json';

let g_metadata: GameMetadata | undefined;

function parseRegionsMetadata(
  data: unknown
): Status<Record<RegionRef, RegionMetadata>> {
  if (!keyInUnknown(data, 'regions')) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      'Core bundle missing key "regions"'
    );
  }

  const regions = data.regions;
  if (!isArray(regions)) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      'Core bundle "regions" entry is not an array'
    );
  }

  const region_metadata_builder: Partial<Record<RegionRef, RegionMetadata>> =
    {};

  for (const region of regions) {
    if (!SetPackRegionMetadataT.guard(region)) {
      let ident = '?';
      if (
        keyInUnknown(region, 'nameRef') &&
        typeof region.nameRef === 'string'
      ) {
        ident = region.nameRef;
      }

      console.warn(
        `Region '${ident}' is either unknown or does not match ` +
          `expected format. Try updating the global list of regions ` +
          `if this region is new.`
      );
      continue;
    }

    region_metadata_builder[region.nameRef as RegionRef] = {
      abbreviation: region.abbreviation,
      imageUrl: region.iconAbsolutePath,
      name: region.nameRef as RegionRef,
    };
  }

  // Check that all regions are in the region metadata map.
  if (
    allRegions().some((region_abbreviation) => {
      return !(region_abbreviation in region_metadata_builder);
    })
  ) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      `Missing regions in core bundle: ${allRegions().filter(
        (region_abbreviation) => {
          return !(region_abbreviation in region_metadata_builder);
        }
      )}`
    );
  }

  const region_metadata: Record<RegionRef, RegionMetadata> =
    region_metadata_builder as Record<RegionRef, RegionMetadata>;

  // For some reason, the icon URLs for non-main regions point to nothing,
  // so set them all to the runeterran region.
  originRegions().forEach((region_name) => {
    region_metadata[region_name].imageUrl = region_metadata.Runeterra.imageUrl;
  });

  return makeOkStatus(region_metadata);
}

function parseFormatsMetadata(
  data: unknown
): Status<Record<DraftFormat, DraftFormatMetadata>> {
  if (!keyInUnknown(data, 'formats')) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      'Core bundle missing key "formats"'
    );
  }

  const formats = data.formats;
  if (!isArray(formats)) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      'Core bundle "formats" entry is not an array'
    );
  }

  const format_metadata_builder: Partial<
    Record<DraftFormat, DraftFormatMetadata>
  > = {};

  for (const format of formats) {
    if (!SetPackDraftFormatMetadataT.guard(format)) {
      // Ignore unknown formats
      continue;
    }

    const name = officialDraftFormatRefToName(format.nameRef as DraftFormatRef);

    format_metadata_builder[name] = {
      imageUrl: format.iconAbsolutePath,
      name: name,
    };
  }

  // Check that all official formats are in the formats metadata map.
  if (
    officialDraftFormats().some((format) => {
      return !(format in format_metadata_builder);
    })
  ) {
    return makeErrStatus(
      StatusCode.INVALID_SET_PACK_FORMAT,
      `Missing formats in core bundle: ${allDraftFormats().filter((format) => {
        return !(format in format_metadata_builder);
      })}`
    );
  }

  const format_metadata: Record<DraftFormat, DraftFormatMetadata> = {
    ...(format_metadata_builder as Record<
      OfficialDraftFormat,
      DraftFormatMetadata
    >),
    ...unofficialFormatMetadata,
  };

  return makeOkStatus(format_metadata);
}

export async function gameMetadata(): Promise<Status<GameMetadata>> {
  if (g_metadata !== undefined) {
    return makeOkStatus(g_metadata);
  }

  const data = await readBundle(CORE_BUNDLE_FILENAME);
  if (!isOk(data)) {
    return data;
  }

  const obj = JSON.parse(data.value) as unknown;

  const regions = parseRegionsMetadata(obj);
  if (!isOk(regions)) {
    return regions;
  }

  const formats = parseFormatsMetadata(obj);
  if (!isOk(formats)) {
    return formats;
  }

  const game_metadata = {
    regions: regions.value,
    formats: formats.value,
  };
  g_metadata = game_metadata;
  return makeOkStatus(game_metadata);
}
