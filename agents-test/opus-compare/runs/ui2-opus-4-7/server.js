const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8080;

const FILES = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
  "/app.js": { file: "app.js", type: "application/javascript; charset=utf-8" },
};

function handle(req, res) {
  const url = req.url.split("?")[0];
  const entry = FILES[url];
  if (!entry) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    console.log(`${req.method} ${req.url} 404`);
    return;
  }
  const filePath = path.join(__dirname, entry.file);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      console.log(`${req.method} ${req.url} 404`);
      return;
    }
    res.writeHead(200, { "Content-Type": entry.type });
    res.end(data);
    console.log(`${req.method} ${req.url} 200`);
  });
}

const server = http.createServer(handle);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Todo UI server listening on http://localhost:${PORT}`);
  });
}

module.exports = server;
