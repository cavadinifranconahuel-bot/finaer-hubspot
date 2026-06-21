const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const FUNCTION_DIR = path.join(__dirname, 'buscar-inquilino', 'buscar-inquilino.functions');

function simpleGet(urlPath) {
  return new Promise((resolve) => {
    https.request({
      hostname: 'api.hubapi.com', path: urlPath, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + TOKEN }
    }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        const raw = Buffer.concat(c).toString();
        console.log(`[${res.statusCode}] GET ${urlPath}`);
        if (res.statusCode !== 404) {
          try { console.log(JSON.stringify(JSON.parse(raw), null, 2).slice(0, 400)); }
          catch { console.log(raw.slice(0, 200)); }
        }
        resolve(res.statusCode);
      });
    }).on('error', e => { console.log('ERR', urlPath, e.message); resolve(0); }).end();
  });
}

async function main() {
  // Probar distintas variantes de la source code API
  await simpleGet('/cms/v3/source-code/draft/');
  await simpleGet('/cms/v3/source-code/published/');
  await simpleGet('/filemanager/api/v3/files/');
  await simpleGet('/cms/v3/source-code/draft/functions/');
  await simpleGet('/cms/v3/source-code/draft/templates/');
}

main().catch(console.error);
