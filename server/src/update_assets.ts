import axios from 'axios'
import { StatusCodes } from 'http-status-codes'
import path from 'path'

import { allFullfilled } from 'common/util/lor_util'
import {
  ErrStatusT,
  OkStatus,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
} from 'common/util/status'

import { config } from 'server/args'
import {
  downloadZipAsset,
  extractFromBundle,
  removeBundle,
} from 'server/bundle'
import bundles from 'server/config/bundles.json'
import { dispatch, persistor, store } from 'server/store'
import {
  selectSetPacksState,
  stateContainsSetPack,
  updateSetPack,
} from 'server/store/set_packs'

type Bundle = (typeof bundles)[number]

export function setUpPollAssetUpdates() {
  // Do once, then set up interval to periodically check for updated assets.
  setImmediate(pollAssetUpdates)
  setInterval(pollAssetUpdates, 60 * 60 * 1000)
}

async function shouldUpdateAsset(bundle: Bundle): Promise<boolean> {
  const state = selectSetPacksState(store.getState())
  if (!stateContainsSetPack(state.setPacks, bundle.setName)) {
    return true
  }

  const lastModified = state.setPacks[bundle.setName].lastModified
  if (lastModified === null) {
    // If no last-modified was set in the last http response, we have to
    // redownload.
    return true
  }

  return await new Promise((resolve) => {
    axios
      .head(bundle.url, {
        headers: {
          'If-Modified-Since': lastModified,
        },
        validateStatus: (status) =>
          status === 200 || status === (StatusCodes.NOT_MODIFIED as number),
      })
      .then((res) => {
        // Only don't update the set pack if it has not been modified since it
        // was last updated.
        resolve(res.status !== (StatusCodes.NOT_MODIFIED as number))
      })
      .catch((reason) => {
        console.log('Error fetching set pack header:', reason)
        resolve(true)
      })
  })
}

async function pollAssetUpdates() {
  const result = await maybeUpdateAssets()
  if (!isOk(result)) {
    console.log('Error while polling for asset update:', result)
  } else {
    persistor.persist()
  }
}

/**
 * Updates each asset that has changed, or that isn't downloaded at all.
 *
 * Set packs can change when a patch comes out, but is not automatically picked
 * up when a new set pack is released.
 */
async function maybeUpdateAssets(): Promise<Status> {
  if (config.sequential) {
    return await maybeUpdateAssetsSerial()
  } else {
    return await maybeUpdateAssetsParallel()
  }
}

async function maybeUpdateAssetsParallel(): Promise<Status> {
  const should_update = await Promise.allSettled(bundles.map(shouldUpdateAsset))
  if (!allFullfilled(should_update)) {
    return makeErrStatus(
      StatusCode.INTERNAL_SERVER_ERROR,
      'Unexpected rejected promise in `maybeUpdateAssetsParallel`'
    )
  }

  const downloads = bundles
    .filter((_bundle, i) => should_update[i].value)
    .map((bundle) => {
      console.log(`downloading package ${bundle.setName}`)
      return updateAsset(bundle)
    })

  const results = await Promise.allSettled(downloads)
  if (
    !allFullfilled(results) ||
    results.some((result) => !isOk(result.value))
  ) {
    return makeErrStatus(
      StatusCode.UPDATE_ASSET_ERROR,
      'Asset update error',
      results
        .filter((result) => result.status === 'rejected' || !isOk(result.value))
        .map((rejected_result) =>
          rejected_result.status === 'rejected'
            ? makeErrStatus(
                StatusCode.INTERNAL_SERVER_ERROR,
                'Unexpected rejected promise'
              )
            : (rejected_result.value as ErrStatusT)
        )
    )
  } else {
    return OkStatus
  }
}

async function maybeUpdateAssetsSerial(): Promise<Status> {
  const should_update = await Promise.allSettled(bundles.map(shouldUpdateAsset))
  if (!allFullfilled(should_update)) {
    return makeErrStatus(
      StatusCode.INTERNAL_SERVER_ERROR,
      'Unexpected rejected promise in `maybeUpdateAssetsParallel`'
    )
  }

  const rejected_results: ErrStatusT[] = []

  for (const bundle of bundles.filter((_bundle, i) => should_update[i])) {
    const result = await updateAsset(bundle)

    if (!isOk(result)) {
      rejected_results.push(result)
    }
  }

  if (rejected_results.length !== 0) {
    return makeErrStatus(
      StatusCode.UPDATE_ASSET_ERROR,
      'Asset update error',
      rejected_results
    )
  } else {
    return OkStatus
  }
}

async function updateAsset(bundle: Bundle) {
  return await new Promise<Status>((resolve) => {
    downloadZipAsset(bundle.url, bundle.setName, (status, headers) => {
      if (!isOk(status)) {
        resolve(status)
        return
      }

      console.log(`extracting package ${bundle.setName}`)
      extractFromBundle(
        bundle.setName,
        bundle.configPath,
        path.basename(bundle.configPath),
        (status) => {
          if (!isOk(status)) {
            resolve(status)
            return
          }

          console.log(`removing extras ${bundle.setName}`)
          removeBundle(bundle.setName, (status) => {
            if (isOk(status)) {
              updateSetPack(dispatch, {
                setPack: bundle.setName,
                lastModified: headers['last-modified'] ?? null,
              })
            }
            resolve(status)
          })
        }
      )
    })
  })
}
