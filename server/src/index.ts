import fs from 'fs'
import http from 'http'
import mime from 'mime'
import path from 'path'

import { isOk } from 'util/status'

import { config } from 'server/args'
import { InitSocket } from 'server/socket_init'
import { updateAssets } from 'server/update_assets'

if (config.download) {
  console.log('downloading assets.')
  updateAssets(config.sequential, (status) => {
    if (!isOk(status)) {
      console.log(status)
      return
    }
    console.log('done downloading!')
  })
}

const app = http.createServer(function (req, resp) {
  // This callback runs when a new connection is made to our HTTP server.
  if (req.url === undefined) {
    return
  }

  let reqFile = req.url
  if (reqFile === '/') {
    reqFile = '/index.html'
  }

  const filename = path.join(config.root_dir, 'static/', reqFile)
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

app.listen(config.port)

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
