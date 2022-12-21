import path from 'path';

import {downloadZipAsset, extractFromBundle, removeBundle} from './bundle';
import bundles from './config/bundles.json';
import {callback_fn} from './util';

export function updateSetPacks(callback : callback_fn = () => undefined) {

  console.log(bundles);
  const promiseList = bundles.map((bundle) => {
    return new Promise((resolve, reject) => {
      console.log(bundle.setName);
      downloadZipAsset(bundle.url, bundle.setName, (err) => {
      if (err) {
        reject(err);
        return;
      }

      extractFromBundle(
          bundle.setName, bundle.configPath, path.basename(bundle.configPath),
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            removeBundle(bundle.setName, (err) => {
              if(err){
                reject(err);
                return;
              }
              resolve(0);
            });
          });
    });
    });
  });

  Promise.all(promiseList).then(results => callback(null));

}
