#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || process.argv[2] || 3000);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function fileForRequest(reqUrl) {
  const parsed = new URL(reqUrl, 'http://localhost');
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/' || pathname === '/tiny-world-builder') pathname = '/tiny-world-builder.html';
  const resolved = path.resolve(root, '.' + pathname);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
    return;
  }
  const file = fileForRequest(req.url);
  if (!file) {
    send(res, 403, 'Forbidden');
    return;
  }
  fs.stat(file, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      send(res, 404, 'Not Found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  });
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Try: npm run dev -- ${port + 1}`);
  } else {
    console.error(err && err.stack ? err.stack : err);
  }
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Tiny World dev server: http://localhost:${port}/tiny-world-builder`);
  console.log('Press Ctrl+C to stop.');
});
