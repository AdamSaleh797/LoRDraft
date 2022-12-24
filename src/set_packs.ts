import path from 'path';
import fs from 'fs';

import {downloadZipAsset, extractFromBundle, removeBundle} from './bundle';
import bundles from './config/bundles.json';
import './assets/set1-en_us.json';

type callback_fn = (err: PromiseRejectedResult[]|null) => void;

export function updateSetPacks(callback: callback_fn = () => undefined) {
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
                if (err) {
                  reject(err);
                  return;
                }
                resolve(0);
              });
            });
      });
    });
  });

  Promise.allSettled(promiseList).then((results) => {
    const err_list = results.filter(
        (result: PromiseSettledResult<unknown>):
            result is PromiseRejectedResult => result.status === 'rejected');
    if (err_list) {
      callback(err_list);
    } else {
      callback(null);
    }
  });

  interface Card{
    rarity : string;
    imageUrl : string;
    cost : number;
    name : string;
    regions : string[];  
  }

  function parseFile(file : string) : Card[] {
      const obj = JSON.parse(fs.readFileSync(file).toString());
      const cards : Card[] = [];
      obj.forEach((card : any) => {
        cards.push({
          rarity : card.rarity,
          imageUrl : card.assets[0].gameAbsolutePath,
          cost : card.cost,
          name : card.name,
          regions : card.regions
         });
      });     
      return cards;
  }

}
