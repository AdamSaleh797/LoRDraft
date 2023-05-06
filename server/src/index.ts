import fs from 'fs'
import http from 'http'
import mime from 'mime'
import path from 'path'
import minimist from 'minimist'

import { InitSocket } from './socket_init'

const _STATIC_DIR = path.resolve(path.join(__dirname, '../../static'))

const args = minimist(process.argv.slice(2), {
  default: {
    port: 2000,
  },
})

/*
updateAssets((status) => {
  if (!isOk(status)) {
    console.log(status)
    return
  }
  console.log('done downloading!')
})
*/

/*
const sets = [
  'set1-en_us.json', 'set2-en_us.json', 'set3-en_us.json', 'set4-en_us.json',
  'set5-en_us.json', 'set6-en_us.json', 'set6cde-en_us.json'
];

let cnt = 0;
sets.forEach((set) => {
  loadSetPack(set, (status, cards) => {
    if (status || !cards) {
      console.log(status);
      return;
    }
    cards.forEach((card) => {
      if (isCollectable(card) && cnt < 10) {
        cnt++;
        console.log(card.name);
        console.log(card.subtypes);
      }
    });
  });
});
*/

const app = http.createServer(function (req, resp) {
  // This callback runs when a new connection is made to our HTTP server.
  if (req.url === undefined) {
    return
  }

  let reqFile = req.url
  if (reqFile === null || reqFile === '/') {
    reqFile = '/index.html'
  }

  const filename = path.join(_STATIC_DIR, reqFile)
  fs.access(filename, fs.constants.R_OK, (err) => {
    if (err !== null) {
      // The file does not exist.
      resp.writeHead(404, { 'Content-Type': 'text/plain' })
      resp.write('Requested file not found: ' + filename)
      resp.end()
      return
    }

    fs.readFile(filename, function (err, data) {
      if (err !== null) {
        // File exists but is not readable (permissions issue?)
        resp.writeHead(500, { 'Content-Type': 'text/plain' })
        resp.write('Internal server error: could not read file')
        resp.end()
        return
      }

      const mimetype = mime.getType(filename)
      if (mimetype === null) {
        // File exists but has unknown mime type.
        resp.writeHead(500, { 'Content-Type': 'text/plain' })
        resp.write('Internal server error: could not read file')
        resp.end()
        return
      }

      resp.writeHead(200, { 'Content-Type': mimetype })
      resp.write(data)
      resp.end()
    })
  })
})

InitSocket(app)

app.listen(args.port)

{
  let addr = app.address()
  if (addr !== null && typeof addr !== 'string') {
    if (addr.family === 'IPv6') {
      addr = `[${addr.address}]:${addr.port}`
    } else {
      addr = `${addr.address}:${addr.port}`
    }
  }
  console.log(`Server running on http://${addr}`)
}
