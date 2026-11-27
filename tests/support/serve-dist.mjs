// Serves dist/ the way GitHub Pages serves the project site: files under /Collections-App/, and
// dist/404.html (with status 404) for any path that is not a file.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const BASE = '/Collections-App';
const ROOT = resolve('dist');
const PORT = Number(process.env.PORT ?? 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

/**
 * Sends a file with its content type.
 * @param {import('node:http').ServerResponse} res The response to write.
 * @param {string} path Absolute path of the file.
 * @param {number} status HTTP status code.
 * @returns {void} Streams the file into the response.
 */
function sendFile(res, path, status) {
  res.writeHead(status, {
    'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(path).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === '/' || pathname === BASE) {
    res.writeHead(302, { Location: `${BASE}/` });
    res.end();
    return;
  }
  if (pathname.startsWith(`${BASE}/`)) {
    const relative = pathname.slice(BASE.length + 1) || 'index.html';
    const file = normalize(join(ROOT, relative));
    if (file.startsWith(ROOT) && existsSync(file) && statSync(file).isFile()) {
      sendFile(res, file, 200);
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory() && existsSync(join(file, 'index.html'))) {
      sendFile(res, join(file, 'index.html'), 200);
      return;
    }
  }
  sendFile(res, join(ROOT, '404.html'), 404);
}).listen(PORT, () => {
  console.log(`Serving dist/ at http://localhost:${PORT}${BASE}/`);
});
