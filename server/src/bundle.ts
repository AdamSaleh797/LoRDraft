import child_process from 'child_process'
import fs from 'fs'
import https from 'https'
import path from 'path'

const _ASSET_DIR = path.join(__dirname, '../assets')

export type callback_fn = (err: Error | null) => void

function prepareAssetsDir() {
  try {
    fs.accessSync(_ASSET_DIR, fs.constants.F_OK)
  } catch (err) {
    fs.mkdirSync(_ASSET_DIR)
  }
}

function unzip_file(
  file: string,
  output_dir: string,
  callback: callback_fn = () => undefined
) {
  child_process.exec(
    `unzip -u ${file} -d ${output_dir}`,
    { cwd: _ASSET_DIR },
    (err) => callback(err)
  )
}

export function downloadZipAsset(
  url: string,
  dst_file_name: string,
  callback: callback_fn = () => undefined
) {
  prepareAssetsDir()

  https.get(url, function (response) {
    const file_path = path.join(_ASSET_DIR, dst_file_name)
    const zip_path = file_path + '.zip'
    const file = fs.createWriteStream(zip_path)
    response.pipe(file)

    file.on('finish', () => {
      file.close()

      unzip_file(zip_path, file_path, (err) => {
        if (err) {
          callback(err)
        } else {
          fs.unlink(zip_path, (err: Error | null) => {
            callback(err)
          })
        }
      })
    })

    file.on('error', (err: Error) => {
      callback(err)
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
  callback: callback_fn = () => undefined
) {
  prepareAssetsDir()

  fs.cp(
    path.join(_ASSET_DIR, bundle, rel_path),
    path.join(_ASSET_DIR, name),
    (err) => {
      callback(err)
    }
  )
}

export function removeBundle(
  bundle: string,
  callback: callback_fn = () => undefined
) {
  prepareAssetsDir()

  fs.rm(path.join(_ASSET_DIR, bundle), { recursive: true }, (err) => {
    callback(err)
  })
}

export function readBundle(
  bundle: string,
  callback: (err: Error | null, data: string | null) => void = () => undefined
) {
  fs.readFile(path.join(_ASSET_DIR, bundle), 'utf-8', callback)
}
