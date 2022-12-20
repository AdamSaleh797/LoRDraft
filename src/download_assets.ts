import decompress from 'decompress';
import fs from 'fs';
import https from 'https';
import path from 'path';

const _DIRNAME = path.resolve();
const _ASSET_DIR = path.join(_DIRNAME, 'assets');

export function downloadZipAsset(url: string, dst_file_name: string, callback: ()=> void) {
  https.get(url, function(response) {
    const file_path = path.join(_ASSET_DIR, dst_file_name);
    const zip_path = file_path + '.zip';
    const file = fs.createWriteStream(zip_path);
    response.pipe(file);

    file.on('finish', () => {
      file.close();

      decompress(zip_path, file_path)
          .then(() => {
            fs.unlink(zip_path, (err) => {
              if (err) {
                throw err;
              }
              callback();
            });
          })
          .catch((error) => {
            console.log(error);
          });
    });
  });
}

/** 
 * Copies file from `bundle` with relative path `rel_path` into asssets directory with name `name`.
 */
export function extractFromBundle(bundle: string, rel_path: string, name: string, callback: ()=> void){
  fs.cp(path.join(_ASSET_DIR, bundle, rel_path), path.join(_ASSET_DIR, name), (err) => {
    if(err){
      throw err;
    }
    callback();
  });
}

export function removeBundle(bundle: string, callback: ()=> void){
  fs.unlink(path.join(_ASSET_DIR, bundle), (err) => {
    if(err){
      throw err;
    }
    callback();
  });
}


