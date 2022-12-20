import {downloadZipAsset, removeBundle, extractFromBundle } from './download_assets';
import path from 'path';
import bundles from './bundles.json';




export function updateSetPacks() {
  console.log(bundles);

  bundles.forEach((bundle) => {
    downloadZipAsset(bundle.url, bundle.setName, ()=> {
      extractFromBundle(bundle.setName, bundle.configPath, path.basename(bundle.configPath), ()=> {
        removeBundle(bundle.setName, ()=>{});
      });
     
    });
    
    
  }) 
}