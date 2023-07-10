import child_process from 'child_process'
import fs from 'fs'
import { IncomingHttpHeaders } from 'http'
import https from 'https'
import path from 'path'

import { Status, StatusCode, isOk, statusFromError } from 'common/util/status'

const ASSET_DIR = path.join(__dirname, '../assets')

function prepareAssetsDir() {
  try {
    fs.accessSync(ASSET_DIR, fs.constants.F_OK)
  } catch (err) {
    fs.mkdirSync(ASSET_DIR)
  }
}

function unzipFile(
  file: string,
  output_dir: string,
  callback: (status: Status) => void = () => undefined
) {
  let cmd
  if (process.platform === 'win32') {
    cmd = `powershell -command "Expand-Archive -Force -Path '${file}' -DestinationPath '${output_dir}'"`
  } else {
    cmd = `unzip -u ${file} -d ${output_dir}`
  }
  child_process.exec(cmd, { cwd: ASSET_DIR }, (err) => {
    callback(statusFromError(err, StatusCode.CHILD_PROCESS_EXEC_ERROR, null))
  })
}

export function downloadZipAsset(
  url: string,
  dst_file_name: string,
  callback: (status: Status, headers: IncomingHttpHeaders) => void = () =>
    undefined
) {
  prepareAssetsDir()

  https.get(url, function (response) {
    const file_path = path.join(ASSET_DIR, dst_file_name)
    const zip_path = file_path + '.zip'
    const file = fs.createWriteStream(zip_path)
    response.pipe(file)

    file.on('finish', () => {
      file.close()

      unzipFile(zip_path, file_path, (status) => {
        if (!isOk(status)) {
          callback(status, response.headers)
        } else {
          fs.unlink(zip_path, (err: Error | null) => {
            callback(
              statusFromError(err, StatusCode.UNZIP_ERROR, null),
              response.headers
            )
          })
        }
      })
    })

    file.on('error', (err: Error) => {
      callback(
        statusFromError(err, StatusCode.FILE_ERROR, null),
        response.headers
      )
    })
  })
}

/**
 * Copies file from `bundle` with relative path `rel_path` into asssets
 * directory with name `name`.
 */
export function extractFromBundle(
  bundle: string,
  rel_path: string,
  name: string,
  callback: (status: Status) => void = () => undefined
) {
  prepareAssetsDir()

  fs.cp(
    path.join(ASSET_DIR, bundle, rel_path),
    path.join(ASSET_DIR, name),
    (err) => {
      callback(statusFromError(err, StatusCode.FILE_CP_ERROR, null))
    }
  )
}

export function removeBundle(
  bundle: string,
  callback: (status: Status) => void = () => undefined
) {
  prepareAssetsDir()

  fs.rm(path.join(ASSET_DIR, bundle), { recursive: true }, (err) => {
    callback(statusFromError(err, StatusCode.FILE_RM_ERROR, null))
  })
}

export function readBundle(
  bundle: string,
  callback: (data: Status<string>) => void = () => undefined
) {
  fs.readFile(path.join(ASSET_DIR, bundle), 'utf-8', (err, data) => {
    callback(statusFromError(err, StatusCode.FILE_READ_ERROR, data))
  })
}
