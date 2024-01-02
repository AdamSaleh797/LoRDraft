import child_process from 'child_process';
import fs from 'fs';
import { IncomingHttpHeaders } from 'http';
import https from 'https';
import path from 'path';

import { Status, StatusCode, isOk, statusFromError } from 'common/util/status';

const ASSET_DIR = path.join(__dirname, '../assets');

function prepareAssetsDir() {
  try {
    fs.accessSync(ASSET_DIR, fs.constants.F_OK);
  } catch (err) {
    fs.mkdirSync(ASSET_DIR);
  }
}

async function unzipFile(file: string, output_dir: string): Promise<Status> {
  return new Promise((resolve) => {
    let cmd;
    if (process.platform === 'win32') {
      cmd = `powershell -command "Expand-Archive -Force -Path '${file}' -DestinationPath '${output_dir}'"`;
    } else {
      cmd = `unzip -u ${file} -d ${output_dir}`;
    }
    child_process.exec(cmd, { cwd: ASSET_DIR }, (err) => {
      resolve(statusFromError(err, StatusCode.CHILD_PROCESS_EXEC_ERROR, null));
    });
  });
}

export async function downloadZipAsset(
  url: string,
  dst_file_name: string
): Promise<[Status, IncomingHttpHeaders]> {
  prepareAssetsDir();

  return new Promise((resolve) => {
    https.get(url, function (response) {
      const file_path = path.join(ASSET_DIR, dst_file_name);
      const zip_path = file_path + '.zip';
      const file = fs.createWriteStream(zip_path);
      response.pipe(file);

      file.on('finish', () => {
        file.close();

        unzipFile(zip_path, file_path).then((status) => {
          if (!isOk(status)) {
            resolve([status, response.headers]);
          } else {
            fs.unlink(zip_path, (err: Error | null) => {
              resolve([
                statusFromError(err, StatusCode.UNZIP_ERROR, null),
                response.headers,
              ]);
            });
          }
        });
      });

      file.on('error', (err: Error) => {
        resolve([
          statusFromError(err, StatusCode.FILE_ERROR, null),
          response.headers,
        ]);
      });
    });
  });
}

/**
 * Copies file from `bundle` with relative path `rel_path` into asssets
 * directory with name `name`.
 */
export async function extractFromBundle(
  bundle: string,
  rel_path: string,
  name: string
): Promise<Status> {
  prepareAssetsDir();

  return new Promise((resolve) => {
    fs.cp(
      path.join(ASSET_DIR, bundle, rel_path),
      path.join(ASSET_DIR, name),
      (err) => {
        resolve(statusFromError(err, StatusCode.FILE_CP_ERROR, null));
      }
    );
  });
}

export async function removeBundle(bundle: string): Promise<Status> {
  prepareAssetsDir();

  return new Promise((resolve) => {
    fs.rm(path.join(ASSET_DIR, bundle), { recursive: true }, (err) => {
      resolve(statusFromError(err, StatusCode.FILE_RM_ERROR, null));
    });
  });
}

export async function readBundle(bundle: string): Promise<Status<string>> {
  return new Promise((resolve) => {
    fs.readFile(path.join(ASSET_DIR, bundle), 'utf-8', (err, data) => {
      resolve(statusFromError(err, StatusCode.FILE_READ_ERROR, data));
    });
  });
}
