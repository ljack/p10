const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const ROUTES = {
  '/':           { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
  '/app.js':     { file: 'app.js',     type: 'application/javascript; charset=utf-8' },
};

function requestHandler(req, res) {
  const route = ROUTES[req.url];

  if (!route) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    console.log(`${req.method} ${req.url} 404`);
    return;
  }

  const filePath = path.join(__dirname, route.file);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      console.log(`${req.method} ${req.url} 500`);
      return;
    }
    res.writeHead(200, { 'Content-Type': route.type });
    res.end(data);
    console.log(`${req.method} ${req.url} 200`);
  });
}

if (require.main === module) {
  http.createServer(requestHandler).listen(PORT, () => {
    console.log(`Todo UI running → http://localhost:${PORT}`);
  });
}

module.exports = { requestHandler };
