/**
 * wf_sheets_stickers.js — Custom code para WF HubSpot
 *
 * Trigger : envío del formulario "Stickers Especiales" (2b527eac-0b46-4908-9c70-8047d3bf9f46)
 * Acción  : agrega una fila en el sheet de pedidos de stickers
 *
 * Hoja destino : 1cBRGREKQAQYqIo4jVmPp3iZpSAsV2YW2D_voAKyjxGA
 * Pestaña      : Hoja 1 (pestaña por defecto)
 *
 * Columnas (A→O):
 *   A Marca temporal  | B OC          | C EDC           | D Inmobiliaria
 *   E Dirección       | F Localidad   | G Contacto inmo | H Celular
 *   I Poster A4       | J Faja        | K Gran Formato  | L Sticker PAM
 *   M URL Foto        | N Observaciones| O # Tanda (vacío — completar a mano)
 *
 * Secretos requeridos en el WF:
 *   token            → HubSpot private app token
 *   GOOGLE_SA_EMAIL  → email de la Service Account
 *   GOOGLE_KEY_1     → primera mitad de la clave privada PEM
 *   GOOGLE_KEY_2     → segunda mitad de la clave privada PEM
 */

const https  = require('https');
const crypto = require('crypto');

const SHEET_ID  = '1cBRGREKQAQYqIo4jVmPp3iZpSAsV2YW2D_voAKyjxGA';
const SHEET_TAB = 'Hoja 1';
const FORM_GUID = '2b527eac-0b46-4908-9c70-8047d3bf9f46';

const PROPS_CONTACT = [
  'email',
  'sticker_oc',
  'sticker_edc',
  'sticker_inmobiliaria',
  'sticker_direccion',
  'sticker_localidad',
  'sticker_contacto_inmo',
  'sticker_celular_contacto',
  'sticker_detalle_pedido',
  'sticker_observaciones',
];

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
  const privateKey  = reconstruirPem(process.env.GOOGLE_KEY_1||'', process.env.GOOGLE_KEY_2||'');
  const clientEmail = process.env.GOOGLE_SA_EMAIL;
  const now         = Math.floor(Date.now() / 1000);
  const header      = Buffer.from(JSON.stringify({ alg:'RS256', typ:'JWT' })).toString('base64url');
  const payload     = Buffer.from(JSON.stringify({
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

// ── HubSpot — leer propiedades del contacto ──────────────────────────────────
async function getDatosContacto(contactId) {
  const propsQuery = PROPS_CONTACT.map(p => 'properties=' + p).join('&');
  const r = await req({
    hostname: 'api.hubapi.com',
    path: `/crm/v3/objects/contacts/${contactId}?${propsQuery}`,
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + process.env.token }
  });
  if (r.status !== 200) throw new Error('No se pudo leer el contacto: ' + JSON.stringify(r.body));
  return r.body.properties;
}

// ── HubSpot — obtener URL de la foto del último submission ───────────────────
async function getFotoUrl(email) {
  const r = await req({
    hostname: 'api.hubapi.com',
    path: `/form-integrations/v1/submissions/forms/${FORM_GUID}?count=50`,
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + process.env.token }
  });
  if (r.status !== 200) throw new Error('No se pudo leer submissions del form: ' + JSON.stringify(r.body));
  const results = r.body.results || [];
  const submission = results.find(s =>
    (s.values || []).some(v => v.name === 'email' && v.value === email)
  );
  if (!submission) return '';
  const fotoField = (submission.values || []).find(v => v.name === 'sticker_foto');
  return fotoField ? (fotoField.value || '') : '';
}

// ── Parseo de sticker_detalle_pedido ─────────────────────────────────────────
function parsearSeccion(detalle, titulo) {
  if (!detalle) return '';
  const re = new RegExp(titulo + ':\\s*(SI|NO)', 'i');
  const m = detalle.match(re);
  if (!m) return '';
  if (m[1].toUpperCase() === 'NO') return 'NO';
  // Extraer atributos de las líneas indentadas que siguen
  const inicio = detalle.indexOf(m[0]) + m[0].length;
  const resto   = detalle.slice(inicio);
  const lineas  = [];
  for (const l of resto.split('\n')) {
    if (l.startsWith('  ') || l.startsWith('\t')) {
      lineas.push(l.trim());
    } else if (l.trim()) {
      break;
    }
  }
  return lineas.length ? lineas.join(' | ') : 'SI';
}

// ── Google Sheets — agregar fila ─────────────────────────────────────────────
async function appendFila(gToken, fila) {
  const range = encodeURIComponent(SHEET_TAB) + '!A1';
  const r = await req({
    hostname: 'sheets.googleapis.com',
    path: `/v4/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + gToken, 'Content-Type': 'application/json' }
  }, { values: [fila] });
  if (r.status !== 200) throw new Error('Error Sheets append: ' + JSON.stringify(r.body));
  return r.body;
}

// ── Main ──────────────────────────────────────────────────────────────────────
exports.main = async (event, callback) => {
  const contactId = String(event.object.objectId);

  const [props, gToken] = await Promise.all([
    getDatosContacto(contactId),
    getGoogleToken()
  ]);

  const fotoUrl = await getFotoUrl(props.email || '');

  const detalle = props.sticker_detalle_pedido || '';
  const a4   = parsearSeccion(detalle, 'POSTER A4');
  const faja = parsearSeccion(detalle, 'FAJA');
  const gf   = parsearSeccion(detalle, 'GRANDES FORMATOS');
  const pam  = parsearSeccion(detalle, 'STICKER APOYO MUTUO');

  const ahora = new Date().toLocaleString('es-AR', { timeZone: 'America/Buenos_Aires' });

  const fila = [
    ahora,
    props.sticker_oc            || '',
    props.sticker_edc           || '',
    props.sticker_inmobiliaria  || '',
    props.sticker_direccion     || '',
    props.sticker_localidad     || '',
    props.sticker_contacto_inmo || '',
    props.sticker_celular_contacto || '',
    a4,
    faja,
    gf,
    pam,
    fotoUrl,
    props.sticker_observaciones || '',
    '',  // # Tanda — se completa a mano
  ];

  await appendFila(gToken, fila);
  console.log('Fila agregada para:', props.email, '| OC:', props.sticker_oc);
  callback({ outputFields: {} });
};
