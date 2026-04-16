const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const routes = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'application/javascript; charset=utf-8' },
};

function createServer() {
  return http.createServer(async (req, res) => {
    const method = req.method || 'GET';
    const { pathname } = new URL(req.url || '/', 'http://localhost');

    const route = routes[pathname];
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      console.log(`${method} ${pathname} 404`);
      return;
    }

    try {
      const filePath = path.join(__dirname, route.file);
      const content = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': route.type });
      res.end(content);
      console.log(`${method} ${pathname} 200`);
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
      console.log(`${method} ${pathname} 500`);
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 8080;
  const server = createServer();
  server.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
  });
}

module.exports = { createServer };
