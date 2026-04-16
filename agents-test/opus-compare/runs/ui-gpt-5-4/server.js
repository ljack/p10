const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.env.PORT) || 8080;
const routes = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
};

function send(res, method, pathname, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
  console.log(`${method} ${pathname} ${status}`);
}
function createServer() {
  return http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const route = routes[pathname];
    if (!route) return send(res, req.method, pathname, 404, 'Not Found');
    fs.readFile(path.join(__dirname, route[0]), (err, content) =>
      err ? send(res, req.method, pathname, 500, 'Internal Server Error') : send(res, req.method, pathname, 200, content, route[1])
    );
  });
}
if (require.main === module) createServer().listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
module.exports = { createServer };
