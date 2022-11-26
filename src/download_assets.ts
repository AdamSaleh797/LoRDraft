import decompress from 'decompress';
import fs from 'fs';
import https from 'https';
import path from 'path';

const _DIRNAME = path.resolve();
const _ASSET_DIR = path.join(_DIRNAME, 'assets');

export default function downloadZipAsset(url: string, dst_file_name: string) {
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
            });
          })
          .catch((error) => {
            console.log(error);
          });
    });
  });
}
