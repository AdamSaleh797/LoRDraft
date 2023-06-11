import path from 'path'

import { allFullfilled, rejectedResults } from 'common/util/lor_util'
import {
  ErrStatusT,
  OkStatus,
  OkStatusT,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
} from 'common/util/status'

import {
  downloadZipAsset,
  extractFromBundle,
  removeBundle,
} from 'server/bundle'
import bundles from 'server/config/bundles.json'

export function updateAssets(
  sequential = false,
  callback: (status: Status) => void = () => undefined
) {
  if (sequential) {
    updateAssetsSequential(callback)
    return
  }

  const promiseList = bundles.map((bundle) => {
    return new Promise(
      (
        resolve: (value: OkStatusT) => void,
        reject: (reason: ErrStatusT) => void
      ) => {
        console.log(`downloading packagenp ${bundle.setName}`)
        downloadZipAsset(bundle.url, bundle.setName, (status) => {
          if (!isOk(status)) {
            reject(status)
            return
          }

          console.log(`extracting package ${bundle.setName}`)
          extractFromBundle(
            bundle.setName,
            bundle.configPath,
            path.basename(bundle.configPath),
            (status) => {
              if (!isOk(status)) {
                reject(status)
                return
              }

              console.log(`removing extras ${bundle.setName}`)
              removeBundle(bundle.setName, (status) => {
                if (!isOk(status)) {
                  reject(status)
                  return
                }
                resolve(status)
              })
            }
          )
        })
      }
    )
  })

  Promise.allSettled(promiseList).then((results) => {
    if (!allFullfilled(results)) {
      callback(
        makeErrStatus(
          StatusCode.UPDATE_ASSET_ERROR,
          'Asset update error',
          rejectedResults(results).map(
            (rejected_result) => rejected_result.reason as ErrStatusT
          )
        )
      )
    } else {
      callback(OkStatus)
    }
  })
}

function updateAssetsSequential(
  callback: (status: Status) => void = () => undefined
) {
  const download_next_bundle = (
    bundles_iterator: Iterator<{
      setName: string
      url: string
      configPath: string
    }>
  ) => {
    const bundle_result = bundles_iterator.next()
    if (bundle_result.done === true) {
      callback(OkStatus)
      return
    }

    const bundle = bundle_result.value

    console.log(`downloading pack ${bundle.setName}`)
    downloadZipAsset(bundle.url, bundle.setName, (status) => {
      if (!isOk(status)) {
        callback(status)
        return
      }
      console.log(`extracting pack ${bundle.setName}`)
      extractFromBundle(
        bundle.setName,
        bundle.configPath,
        path.basename(bundle.configPath),
        (status) => {
          if (!isOk(status)) {
            callback(status)
            return
          }

          console.log(`removing extras ${bundle.setName}`)
          removeBundle(bundle.setName, (status) => {
            if (!isOk(status)) {
              callback(status)
            } else {
              download_next_bundle(bundles_iterator)
            }
          })
        }
      )
    })
  }

  download_next_bundle(bundles.values())
}
