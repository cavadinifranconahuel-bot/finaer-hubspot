/**
 * wf_sheets_reclamos.js — Custom code para WF HubSpot
 *
 * Trigger : envío del formulario "Sugerencias y reclamos" (7b30fd58-18ef-4654-9e5e-7badc0da3f55)
 * Acción  : agrega una fila en la pestaña "Respuestas de formulario" de la hoja de Reclamos
 *
 * Hoja destino : 1Xg-LazOj8QzTwKcbGhCr91wLO_o5RmV29QUgO0NisjQ
 * Pestaña      : Respuestas de formulario
 *
 * Columnas (A→H):
 *   A Marca temporal | B Nombre y Apellido | C Número Celular | D Correo electrónico
 *   E Tipo de Cliente | F Motivo de su reclamo | G Detalle de su reclamo | H Información Adicional
 *
 * Secretos requeridos en el WF:
 *   token            → HubSpot private app token
 *   GOOGLE_SA_EMAIL  → email de la Service Account
 *   GOOGLE_KEY_1     → primera mitad de la clave privada PEM
 *   GOOGLE_KEY_2     → segunda mitad de la clave privada PEM
 */

const https  = require('https');
const crypto = require('crypto');

const SHEET_ID  = '1Xg-LazOj8QzTwKcbGhCr91wLO_o5RmV29QUgO0NisjQ';
const SHEET_TAB = 'Respuestas de formulario';
const PROPS     = ['firstname','lastname','phone','email',
                   'tipo_de_cliente','tipo_de_cliente__otro',
                   'motivo_de_su_reclamo','content','informacion_adicional'];

// ── HTTP helper ──────────────────────────────────────────────────────────────
function req(options, body) {
  return new Promise((resolve, reject) => {
    const data = body
      ? (typeof body === 'string' ? Buffer.from(body) : Buffer.from(JSON.stringify(body)))
      : null;
    if (data) options.headers['Content-Length'] = data.length;
    const r = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        try { resolve({ status: res.statusCode, body: JSON.parse(raw.toString()) }); }
        catch { resolve({ status: res.statusCode, body: raw.toString() }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// ── Google auth ──────────────────────────────────────────────────────────────
function reconstruirPem(parte1, parte2) {
  const raw = (parte1 + parte2).replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  const headerMatch = raw.match(/-----BEGIN[^-]+-----/);
  const footerMatch = raw.match(/-----END[^-]+-----/);
  if (!headerMatch || !footerMatch) throw new Error('PEM inválido');
  const header = headerMatch[0];
  const footer = footerMatch[0];
  const b64 = raw.slice(raw.indexOf(header) + header.length, raw.lastIndexOf(footer)).replace(/\s/g, '');
  return `${header}\n${(b64.match(/.{1,64}/g)||[]).join('\n')}\n${footer}\n`;
}

async function getGoogleToken() {
  const privateKey   = reconstruirPem(process.env.GOOGLE_KEY_1||'', process.env.GOOGLE_KEY_2||'');
  const clientEmail  = process.env.GOOGLE_SA_EMAIL;
  const now          = Math.floor(Date.now() / 1000);
  const header       = Buffer.from(JSON.stringify({ alg:'RS256', typ:'JWT' })).toString('base64url');
  const payload      = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  })).toString('base64url');
  const sigInput  = `${header}.${payload}`;
  const keyObject = crypto.createPrivateKey({ key: privateKey, format: 'pem', type: 'pkcs8' });
  const sig       = crypto.sign('SHA256', Buffer.from(sigInput), keyObject).toString('base64url');
  const jwt       = `${sigInput}.${sig}`;
  const body      = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  const r = await req({
    hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, body);
  if (!r.body.access_token) throw new Error('Google auth falló: ' + JSON.stringify(r.body));
  return r.body.access_token;
}

// ── HubSpot — leer contacto ──────────────────────────────────────────────────
async function getContacto(contactId) {
  const r = await req({
    hostname: 'api.hubapi.com',
    path: `/crm/v3/objects/contacts/${contactId}?properties=${PROPS.join(',')}`,
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + process.env.token, 'Content-Type': 'application/json' }
  });
  if (r.status !== 200) throw new Error('No se pudo leer el contacto: ' + JSON.stringify(r.body));
  return r.body.properties;
}

// ── Google Sheets — agregar fila ─────────────────────────────────────────────
async function appendFila(gToken, fila) {
  const range = SHEET_TAB.replace(/ /g, '%20') + '!A1';
  const r = await req({
    hostname: 'sheets.googleapis.com',
    path: `/v4/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + gToken, 'Content-Type': 'application/json' }
  }, { values: [fila] });
  if (r.status !== 200) throw new Error('Error Sheets append: ' + JSON.stringify(r.body));
  return r.body;
}

// ── Main ──────────────────────────────────────────────────────────────────────
exports.main = async (event, callback) => {
  const contactId = String(event.object.objectId);

  const [p, gToken] = await Promise.all([
    getContacto(contactId),
    getGoogleToken()
  ]);

  const ahora  = new Date().toLocaleString('es-AR', { timeZone: 'America/Buenos_Aires' });
  const nombre = [p.firstname||'', p.lastname||''].filter(Boolean).join(' ');

  let tipo = p.tipo_de_cliente || '';
  if (tipo === 'Otro' && p.tipo_de_cliente__otro) tipo = `Otro (${p.tipo_de_cliente__otro})`;

  const fila = [
    ahora,
    nombre,
    p.phone               || '',
    p.email               || '',
    tipo,
    p.motivo_de_su_reclamo|| '',
    p.content             || '',
    p.informacion_adicional|| '',
  ];

  await appendFila(gToken, fila);
  console.log('Fila agregada para:', p.email);
  callback({ outputFields: {} });
};
