const https = require('https');

const TOKEN = process.env.HUBSPOT_TOKEN;
const PAGE_ID = '421841444086';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.hubapi.com', path, method,
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        const raw = Buffer.concat(c).toString();
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    }).on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const page = await api('GET', `/cms/v3/pages/landing-pages/${PAGE_ID}`);
  let footer = page.body.footerHtml;

  const oldBlock = `<option value="jueves_2_julio">Jueves 2 de Julio</option>
        <option value="miercoles_1_julio">Miércoles 1 de Julio</option>`;

  const newBlock = `<option value="miercoles_1_julio">Miércoles 1 de Julio</option>
        <option value="jueves_2_julio">Jueves 2 de Julio</option>`;

  if (!footer.includes('jueves_2_julio')) {
    console.log('ERROR: No se encontró el bloque esperado.');
    return;
  }

  const updated = footer.replace(oldBlock, newBlock);

  const patch = await api('PATCH', `/cms/v3/pages/landing-pages/${PAGE_ID}`, { footerHtml: updated });
  if (patch.status !== 200) {
    console.log('ERROR al actualizar:', JSON.stringify(patch.body));
    return;
  }

  const publish = await api('POST', `/cms/v3/pages/landing-pages/${PAGE_ID}/draft/push-live`);
  if (publish.status === 204 || publish.status === 200) {
    console.log('✓ Publicado. Orden: Miércoles 1 → Jueves 2 → Lunes 6 → Martes 7.');
  } else {
    console.log('ERROR al publicar:', JSON.stringify(publish.body));
  }
}

main().catch(console.error);
