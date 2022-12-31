import fs from 'fs'
import http from 'http'
import mime from 'mime'
import path from 'path'
import url from 'url'

// import { isCollectable, parseFile, updateSetPacks } from './set_packs'
import { InitSocket } from './socket_init'

const _STATIC_DIR = path.resolve(path.join(__dirname, '../../static'))

const port = 2001

/*
updateSetPacks((err) => {
  if (err) {
    console.log(err)
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
  loadSetPack(set, (err, cards) => {
    if (err || !cards) {
      console.log(err);
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
  if (typeof req.url === 'undefined') {
    return
  }
  let reqFile = url.parse(req.url).pathname
  if (reqFile === null || reqFile === '/') {
    reqFile = '/index.html'
  }
  const filename = path.join(_STATIC_DIR, reqFile)
  fs.exists(filename, function (exists) {
    if (exists) {
      fs.readFile(filename, function (err, data) {
        if (err) {
          // File exists but is not readable (permissions issue?)
          resp.writeHead(500, { 'Content-Type': 'text/plain' })
          resp.write('Internal server error: could not read file')
          resp.end()
          return
        }

        // File exists and is readable
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
    } else {
      // File does not exist
      resp.writeHead(404, { 'Content-Type': 'text/plain' })
      resp.write('Requested file not found: ' + filename)
      resp.end()
    }
  })
})

InitSocket(app)

app.listen(port)

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
