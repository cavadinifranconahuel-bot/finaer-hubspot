/**
 * wf_sheets_satisfaccion.js — Custom code para WF HubSpot
 *
 * Trigger : envío del formulario "Encuesta de Satisfacción" (7ee61e33-ae20-4428-bcd5-66aab5906927)
 * Acción  : agrega una fila en la pestaña "Respuestas de formulario" de la hoja de Satisfacción
 *
 * Hoja destino : 12UB9mS-RBpgzxkTVAV4MCqN2wUNcw7AsR9kBW6iYBQg
 * Pestaña      : Respuestas de formulario
 *
 * Columnas (A→K):
 *   A Marca temporal
 *   B ¿Cómo calificás el proceso para completar tu Solicitud de Garantía? (satisfaccion_calif_solicitud)
 *   C ¿Cómo calificás la atención y asesoramiento en general?             (satisfaccion_calif_atencion)
 *   D Comentario / Sugerencia                                              (satisfaccion_comentario)
 *   E ¿Nos autoriza a publicar su comentario?                             (satisfaccion_autoriza_publicar)
 *   F Nombre y Apellido
 *   G Edad                                                                 (satisfaccion_edad)
 *   H Oficina Comercial                                                    (satisfaccion_oficina)
 *   I ¿Cómo calificás el proceso firmar electrónicamente?                  (satisfaccion_calif_firma)
 *   J ¿Recomendaría a Finaer? (NPS 0–10)                                  (satisfaccion_nps)
 *   K Correo Electrónico
 *
 * Secretos requeridos en el WF:
 *   token            → HubSpot private app token
 *   GOOGLE_SA_EMAIL  → email de la Service Account
 *   GOOGLE_KEY_1     → primera mitad de la clave privada PEM
 *   GOOGLE_KEY_2     → segunda mitad de la clave privada PEM
 */

const https  = require('https');
const crypto = require('crypto');

const SHEET_ID  = '12UB9mS-RBpgzxkTVAV4MCqN2wUNcw7AsR9kBW6iYBQg';
const SHEET_TAB = 'Respuestas de formulario';
const PROPS     = ['firstname','lastname','email',
                   'satisfaccion_calif_solicitud','satisfaccion_calif_atencion',
                   'satisfaccion_comentario','satisfaccion_autoriza_publicar',
                   'satisfaccion_edad','satisfaccion_oficina',
                   'satisfaccion_calif_firma','satisfaccion_nps'];

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
  try {
    const contactId = String(event.object.objectId);

    const [p, gToken] = await Promise.all([
      getContacto(contactId),
      getGoogleToken()
    ]);

    const ahora  = new Date().toLocaleString('es-AR', { timeZone: 'America/Buenos_Aires' });
    const nombre = [p.firstname||'', p.lastname||''].filter(Boolean).join(' ');

    const fila = [
      ahora,                              // A — Marca temporal
      p.satisfaccion_calif_solicitud||'', // B — Calificación solicitud
      p.satisfaccion_calif_atencion ||'', // C — Calificación atención
      p.satisfaccion_comentario     ||'', // D — Comentario
      p.satisfaccion_autoriza_publicar||'',// E — Autoriza publicar
      nombre,                             // F — Nombre y Apellido
      p.satisfaccion_edad           ||'', // G — Edad
      p.satisfaccion_oficina        ||'', // H — Oficina
      p.satisfaccion_calif_firma    ||'', // I — Calificación firma
      p.satisfaccion_nps            ||'', // J — NPS
      p.email                       ||'', // K — Correo
    ];

    await appendFila(gToken, fila);
    console.log('Fila agregada para:', p.email);
    callback({ outputFields: {} });

  } catch (e) {
    console.error('Error:', e.message);
    callback({ outputFields: {} });
  }
};
