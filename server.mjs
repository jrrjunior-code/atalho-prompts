import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const cache = new Map();
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!['index.html', 'styles.css', 'app.js', 'favicon.svg'].includes(relative) && !/^data\/[\w.-]+\.json$/.test(relative)) {
      res.writeHead(404); return res.end('Não encontrado');
    }
    const file = path.join(root, relative);
    const info = await stat(file);
    let entry = cache.get(file);
    if (!entry || entry.mtime !== info.mtimeMs) {
      const raw = await readFile(file);
      entry = { raw, zipped: gzipSync(raw), mtime: info.mtimeMs };
      cache.set(file, entry);
    }
    const gzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache', 'Vary': 'Accept-Encoding',
      'X-Content-Type-Options': 'nosniff',
      ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
    });
    res.end(gzip ? entry.zipped : entry.raw);
  } catch {
    res.writeHead(404); res.end('Não encontrado');
  }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Atalho disponível em http://localhost:' + (process.env.PORT || 3000)));
