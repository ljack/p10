const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

const ROUTES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/app.js': 'app.js',
};

const server = http.createServer((req, res) => {
  const file = ROUTES[req.url];
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    console.log(`${req.method} ${req.url} 404`);
    return;
  }
  const filePath = path.join(__dirname, file);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      console.log(`${req.method} ${req.url} 500`);
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
    console.log(`${req.method} ${req.url} 200`);
  });
});

server.listen(PORT, () => {
  console.log(`Todo UI serving on http://localhost:${PORT}`);
});
