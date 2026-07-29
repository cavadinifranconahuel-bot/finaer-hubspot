const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const TOKEN = process.env.HUBSPOT_TOKEN;
const PORT  = 3001;
const HTML  = path.join(__dirname, 'notificacion-incumplimiento.html');

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

http.createServer((req, res) => {

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS);
    return res.end();
  }

  // Servir el wizard HTML
  if (req.url === '/' || req.url === '/wizard') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(HTML));
  }

  // Proxy hacia HubSpot: /hs/* → api.hubapi.com/*
  if (req.url.startsWith('/hs/')) {
    const hsPath = req.url.replace('/hs/', '/');
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const options = {
        hostname: 'api.hubapi.com',
        path:     hsPath,
        method:   req.method,
        headers: {
          'Authorization': 'Bearer ' + TOKEN,
          'Content-Type':  'application/json',
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
        }
      };

      const proxy = https.request(options, hsRes => {
        const chunks = [];
        hsRes.on('data', d => chunks.push(d));
        hsRes.on('end', () => {
          res.writeHead(hsRes.statusCode, { ...CORS, 'Content-Type': 'application/json' });
          res.end(Buffer.concat(chunks));
        });
      });

      proxy.on('error', e => {
        res.writeHead(500, CORS);
        res.end(JSON.stringify({ error: e.message }));
      });

      if (body) proxy.write(body);
      proxy.end();
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');

}).listen(PORT, () => {
  console.log(`\n  Proxy corriendo en http://localhost:${PORT}/wizard\n`);
});
