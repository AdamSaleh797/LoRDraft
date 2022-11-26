import http from "http";
import url from "url";
import path from "path";
import mime from "mime";
import fs from "fs";

import downloadAsset from "./src/download_assets.mjs";

const __dirname = path.resolve();

let port = 80;

downloadAsset("https://dd.b.pvp.net/latest/set1-lite-en_us.zip", "set1-lite");

/*
var app = http.createServer(function(req, resp) {
  // This callback runs when a new connection is made to our HTTP server.
  var reqFile = url.parse(req.url).pathname;
  if (reqFile === "/") {
    reqFile = "/index.html";
  }
  var filename = path.join(__dirname, "/public", reqFile);
  (fs.exists || path.exists)(filename, function(exists){
    if (exists) {
      fs.readFile(filename, function(err, data){
        if (err) {
          // File exists but is not readable (permissions issue?)
          resp.writeHead(500, {
            "Content-Type": "text/plain"
          });
          resp.write("Internal server error: could not read file");
          resp.end();
          return;
        }

        // File exists and is readable
        var mimetype = mime.getType(filename);
        resp.writeHead(200, {
          "Content-Type": mimetype
        });
        resp.write(data);
        resp.end();
      });
    }
    else {
      // File does not exist
      resp.writeHead(404, {
        "Content-Type": "text/plain"
      });
      resp.write("Requested file not found: "+filename);
      resp.end();
    }
  });
});
app.listen(port);
*/
