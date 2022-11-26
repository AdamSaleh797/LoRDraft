import fs from 'fs';
import http from 'http';
import mime from 'mime';
import path from 'path';
import url from 'url';

// import downloadAsset from "./src/download_assets.mjs";

const __dirname = path.resolve();

const port = 80;

// downloadAsset("https://dd.b.pvp.net/latest/set1-lite-en_us.zip",
// "set1-lite");


const app = http.createServer(function(req, resp) {
  // This callback runs when a new connection is made to our HTTP server.
  let reqFile = url.parse(req.url).pathname;
  if (reqFile === '/') {
    reqFile = '/main.html';
  }
  const filename = path.join(__dirname, '/static', reqFile);
  (fs.exists || path.exists)(filename, function(exists) {
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
