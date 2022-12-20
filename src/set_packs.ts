import path from 'path';

import {downloadZipAsset, extractFromBundle, removeBundle} from './bundle';
import bundles from './config/bundles.json';


export function updateSetPacks() {
  console.log(bundles);

  bundles.forEach((bundle) => {
    downloadZipAsset(bundle.url, bundle.setName, (err) => {
      if (err) {
        throw err;
      }

      extractFromBundle(
          bundle.setName, bundle.configPath, path.basename(bundle.configPath),
          (err) => {
            if (err) {
              throw err;
            }

            removeBundle(bundle.setName);
          });
    });
  })
}
