"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT, 10) || 8080;

const FILES = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
  "/app.js": { file: "app.js", type: "application/javascript; charset=utf-8" },
};

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  const entry = FILES[url];
  const log = (status) =>
    process.stdout.write(`${req.method} ${req.url} ${status}\n`);

  if (!entry || req.method !== "GET") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    log(404);
    return;
  }

  const filePath = path.join(__dirname, entry.file);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error");
      log(500);
      return;
    }
    res.writeHead(200, {
      "Content-Type": entry.type,
      "Cache-Control": "no-cache",
    });
    res.end(data);
    log(200);
  });
});

server.listen(PORT, () => {
  process.stdout.write(`Todo UI listening on http://localhost:${PORT}\n`);
});
