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
  callback: (status: Status) => void = () => undefined
) {
  const promiseList = bundles.map((bundle) => {
    return new Promise(
      (
        resolve: (value: OkStatusT) => void,
        reject: (reason: ErrStatusT) => void
      ) => {
        downloadZipAsset(bundle.url, bundle.setName, (status) => {
          if (!isOk(status)) {
            reject(status)
            return
          }

          extractFromBundle(
            bundle.setName,
            bundle.configPath,
            path.basename(bundle.configPath),
            (status) => {
              if (!isOk(status)) {
                reject(status)
                return
              }

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
