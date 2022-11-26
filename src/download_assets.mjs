import decompress from 'decompress';
import fs from 'fs';
import https from 'https';
import path from 'path';

const _DIRNAME = path.resolve();
const _ASSET_DIR = _DIRNAME + '/assets';

export default function downloadAsset(url, dst_file_name) {
  const request = https.get(url, function(response) {
    const path = _ASSET_DIR + '/' + dst_file_name;
    let file = fs.createWriteStream(path + '.zip');
    response.pipe(file);

    file.on('finish', () => {
      file.close();

      decompress(path + '.zip', path).then((files) => {}).catch((error) => {
        console.log(error);
      });
    });
  });
}
