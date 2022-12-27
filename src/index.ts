import fs from 'fs';
import http from 'http';
import mime from 'mime';
import path from 'path';
import url from 'url';

import {parseFile, updateSetPacks} from './set_packs';

const _STATIC_DIR = path.resolve(path.join(__dirname, '../static'));

const port = 80;

// downloadZipAsset('https://dd.b.pvp.net/latest/set1-lite-en_us.zip',
// 'set1-lite');
/*updateSetPacks((err) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log('finished hehe');
});*/

const packs = [
  'set1-en_us.json', 'set2-en_us.json', 'set3-en_us.json', 'set4-en_us.json',
  'set5-en_us.json', 'set6-en_us.json', 'set6cde-en_us.json'
];

packs.forEach((pack) => {
  parseFile(pack, (err, cards) => {
    if (err || !cards) {
      console.log(err);
      return;
    }
    cards.forEach((card) => {
      if (card.subtypes.length > 1) {
        console.log(card.name);
        console.log(card.subtypes);
      }
    });
  });
});

/*
const app = http.createServer(function(req, resp) {
  // This callback runs when a new connection is made to our HTTP server.
  if (typeof req.url === "undefined") {
    return;
  }
  let reqFile = url.parse(req.url).pathname;
  if (reqFile === null || reqFile === '/') {
    reqFile = '/main.html';
  }
  const filename = path.join(_STATIC_DIR, reqFile);
  fs.exists(filename, function(exists) {
    if (exists) {
      fs.readFile(filename, function(err, data) {
        if (err) {
          // File exists but is not readable (permissions issue?)
          resp.writeHead(500, {'Content-Type': 'text/plain'});
          resp.write('Internal server error: could not read file');
          resp.end();
          return;
        }

        // File exists and is readable
        const mimetype = mime.getType(filename);
        if (mimetype === null) {
          // File exists but has unknown mime type.
          resp.writeHead(500, {'Content-Type': 'text/plain'});
          resp.write('Internal server error: could not read file');
          resp.end();
          return;
        }
        resp.writeHead(200, {'Content-Type': mimetype});
        resp.write(data);
        resp.end();
      });
    } else {
      // File does not exist
      resp.writeHead(404, {'Content-Type': 'text/plain'});
      resp.write('Requested file not found: ' + filename);
      resp.end();
    }
  });
});
app.listen(port);
*/
