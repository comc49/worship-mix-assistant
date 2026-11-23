// A tiny static server for the production build, with index.html fallback for app routes.
// Used by the offline Playwright test, because the service worker only runs in a production build.
// It sends the same security headers as vercel.json, so the test runs under the real content security policy.
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const ROOT = join(process.cwd(), 'dist/worship-mix-assistant/browser');
const PORT = Number(process.env.PORT ?? 4300);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'));
const SECURITY_HEADERS = {};
for (const header of vercelConfig.headers[0].headers) {
  SECURITY_HEADERS[header.key] = header.value;
}

createServer((request, response) => {
  const urlPath = decodeURIComponent((request.url ?? '/').split('?')[0]);
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(ROOT, safePath);
  const isFile = existsSync(filePath) && statSync(filePath).isFile();
  if (!isFile) {
    filePath = join(ROOT, 'index.html');
  }
  response.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': TYPES[extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
}).listen(PORT, '127.0.0.1', () => console.log(`Serving ${ROOT} on http://localhost:${PORT}`));
