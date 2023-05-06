import { downloadZipAsset, extractFromBundle, removeBundle } from './bundle'
import {
  allFullfilled,
  ErrStatusT,
  isOk,
  makeErrStatus,
  OkStatus,
  OkStatusT,
  rejectedResults,
  Status,
  StatusCode,
} from 'lor_util'
import path from 'path'

import bundles from './config/bundles.json'

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
  bundles.forEach((bundle) => {
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
              return
            }
          })
        }
      )
    })
  })
  callback(OkStatus)
}
