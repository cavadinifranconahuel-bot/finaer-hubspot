const https = require('https');
const crypto = require('crypto');
const net = require('net');
const tls = require('tls');

const TEMPLATE_DOC_ID = '1LWhpPEsJEOcUT7RGnuBnH8VTW4z6wusUynjCuWz3IKY';
const PDF_FOLDER_ID = '0AMqLgchtRrX4Uk9PVA'; // Shared Drive — Doc temporal + PDF final (service account = Content Manager)
const SMTP_HOST = 'smtp.hubapi.com';
const SMTP_PORT = 587;
const FROM_EMAIL = 'incumplimientos@finaersa.com.ar';

function req(options, body) {
  return new Promise((resolve, reject) => {
    const data = body
      ? (Buffer.isBuffer(body) ? body : typeof body === 'string' ? Buffer.from(body) : Buffer.from(JSON.stringify(body)))
      : null;
    if (data) options.headers['Content-Length'] = data.length;
    const r = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        try { resolve({ status: res.statusCode, body: JSON.parse(raw.toString()), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: raw, headers: res.headers }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function reconstruirPem(parte1, parte2) {
  const raw = (parte1 + parte2).replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  const headerMatch = raw.match(/-----BEGIN[^-]+-----/);
  const footerMatch = raw.match(/-----END[^-]+-----/);
  if (!headerMatch || !footerMatch) throw new Error('PEM invalido: falta header/footer');
  const header = headerMatch[0];
  const footer = footerMatch[0];
  const start = raw.indexOf(header) + header.length;
  const end = raw.lastIndexOf(footer);
  const b64 = raw.slice(start, end).replace(/\s/g, '');
  const lineas = b64.match(/.{1,64}/g) || [];
  return `${header}\n${lineas.join('\n')}\n${footer}\n`;
}

async function getGoogleToken() {
  const privateKey = reconstruirPem(process.env.GOOGLE_KEY_1 || '', process.env.GOOGLE_KEY_2 || '');
  const clientEmail = process.env.GOOGLE_SA_EMAIL;
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })).toString('base64url');
  const sigInput = `${header}.${payload}`;
  const keyObject = crypto.createPrivateKey({ key: privateKey, format: 'pem', type: 'pkcs8' });
  const sig = crypto.sign('SHA256', Buffer.from(sigInput), keyObject).toString('base64url');
  const jwt = `${sigInput}.${sig}`;
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  const r = await req({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, body);
  if (!r.body.access_token) throw new Error('Google auth fallo: ' + JSON.stringify(r.body));
  return r.body.access_token;
}

async function copiarTemplate(token, titulo) {
  const r = await req({
    hostname: 'www.googleapis.com',
    path: `/drive/v3/files/${TEMPLATE_DOC_ID}/copy?supportsAllDrives=true`,
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
  }, { name: titulo, parents: [PDF_FOLDER_ID] });
  if (!r.body.id) throw new Error('Error copiando template: ' + JSON.stringify(r.body));
  return r.body.id;
}

function numeroALetras(n) {
  if (n === 0) return 'CERO';
  const und = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
               'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE'];
  const dec = ['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  const cen = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
               'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
  function menor1000(x) {
    if (x === 0) return '';
    if (x < 20) return und[x];
    if (x < 30) return x === 20 ? 'VEINTE' : 'VEINTI' + und[x - 20];
    if (x < 100) { const d = Math.floor(x/10), u = x%10; return dec[d] + (u ? ' Y ' + und[u] : ''); }
    if (x === 100) return 'CIEN';
    const c = Math.floor(x/100), r = x%100;
    return cen[c] + (r ? ' ' + menor1000(r) : '');
  }
  const mill = Math.floor(n / 1000000);
  const mil  = Math.floor((n % 1000000) / 1000);
  const res  = n % 1000;
  const partes = [];
  if (mill) partes.push(mill === 1 ? 'UN MILLÓN' : menor1000(mill) + ' MILLONES');
  if (mil)  partes.push(mil  === 1 ? 'MIL'       : menor1000(mil)  + ' MIL');
  if (res)  partes.push(menor1000(res));
  return partes.join(' ');
}

function montoEnLetras(monto) {
  const entero = Math.floor(monto);
  const cents  = Math.round((monto - entero) * 100);
  let letras = numeroALetras(entero).toLowerCase();
  if (cents > 0) letras += ' con ' + String(cents).padStart(2, '0') + '/100';
  return letras;
}

async function reemplazarPlaceholders(token, docId, fields) {
  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Buenos_Aires'
  });
  const conceptos = {
    'Alquiler':              parseFloat(fields.deuda_alquiler) || 0,
    'Expensas':              parseFloat(fields.deuda_expensas) || 0,
    'Luz':                   parseFloat(fields.deuda_luz) || 0,
    'AYSA':                  parseFloat(fields.deuda_aysa) || 0,
    'Gas':                   parseFloat(fields.deuda_gas) || 0,
    'ABL':                   parseFloat(fields.deuda_abl) || 0,
    'Punitorios Alquiler':   parseFloat(fields.punitorio_alquiler) || 0
  };
  const fmt = (n) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const montoTotal = Object.values(conceptos).reduce((s, v) => s + v, 0);
  const montoTotalNum = montoTotal > 0 ? montoTotal : (parseFloat(fields.monto_total_de_la_deuda_acumulada) || 0);
  const montoNumero = fmt(montoTotalNum);
  const periodo = fields.periodo_de_deuda || '';
  const detalleDeudas = Object.entries(conceptos)
    .filter(([, v]) => v > 0)
    .map(([label, v]) => `-${label}${periodo ? ` [${periodo}]` : ''} $${fmt(v)}.-`)
    .join('\n');

  const reemplazos = {
    '{{FECHA}}': fecha,
    '{{NRO_EXPEDIENTE}}': fields.nro_expediente || '',
    '{{DETALLE_DEUDAS}}': detalleDeudas,
    '{{MONTO_NUMERO}}': montoNumero,
    '{{MONTO_LETRAS}}': fields.monto_total_deuda_letras || montoEnLetras(montoTotalNum),
    '{{NOMBRE_RECEPTOR}}': fields.nombre_y_apellido_del_propietario || '',
    '{{NOMBRE_INQUILINO}}': fields.nombre_y_apellido_del_inquilino || '',
    '{{DNI_INQUILINO}}': fields.dni_inquilino || '',
    '{{DIRECCION}}': fields.direccion_del_inmueble || '',
    '{{PERIODO}}': fields.periodo_de_deuda || ''
  };
  const requests = Object.entries(reemplazos).map(([placeholder, value]) => ({
    replaceAllText: { containsText: { text: placeholder, matchCase: true }, replaceText: value }
  }));
  const r = await req({
    hostname: 'docs.googleapis.com',
    path: `/v1/documents/${docId}:batchUpdate`,
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
  }, { requests });
  if (r.status !== 200) throw new Error('Error en batchUpdate Docs: ' + JSON.stringify(r.body));
}

async function exportarPdf(token, docId) {
  const r = await req({
    hostname: 'www.googleapis.com',
    path: `/drive/v3/files/${docId}/export?mimeType=application%2Fpdf&supportsAllDrives=true`,
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (r.status !== 200) throw new Error('Error exportando PDF: status ' + r.status);
  return r.body.toString('base64');
}

async function guardarPdfEnDrive(token, pdfBase64, nombre) {
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  const boundary = 'PDF_' + Date.now().toString(36);
  const meta = JSON.stringify({ name: nombre, parents: [PDF_FOLDER_ID], mimeType: 'application/pdf' });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`),
    pdfBuffer,
    Buffer.from(`\r\n--${boundary}--`)
  ]);
  const r = await req({
    hostname: 'www.googleapis.com',
    path: `/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true`,
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': `multipart/related; boundary="${boundary}"` }
  }, body);
  if (!r.body.id) throw new Error('Error guardando PDF en Drive: ' + JSON.stringify(r.body));
}

async function eliminarArchivo(token, docId) {
  await req({
    hostname: 'www.googleapis.com',
    path: `/drive/v3/files/${docId}?supportsAllDrives=true`,
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
}

async function enviarEmailSmtp(pdfBase64, fields) {
  const smtpUser = process.env.HS_SMTP_USER || '';
  const smtpPass = process.env.HS_SMTP_PASS || '';
  if (!smtpUser || !smtpPass) throw new Error('HS_SMTP_USER o HS_SMTP_PASS no configurados');

  const boundary = 'FINAER_' + Date.now().toString(36);
  const fileName = `${fields.nombre_y_apellido_del_inquilino || 'Inquilino'} - ${fields.nro_expediente || ''} - ${fields.periodo_de_deuda || ''}.pdf`;
  const toEmail = fields.correo_del_propietario;

  const nombreInquilino = fields.nombre_y_apellido_del_inquilino || '';
  const dniInquilino = fields.dni_inquilino || '';
  const htmlBody = '<p>Estimado/a,</p>'
    + '<p>Por medio de la presente, <strong>SISTEMA FINAER S.A.</strong> le informa que se ha realizado '
    + 'la transferencia bancaria correspondiente al incumplimiento de pago del/la inquilino/a '
    + `<strong>${nombreInquilino}</strong>, DNI <strong>${dniInquilino}</strong>.</p>`
    + '<p>Encontrara adjunta la <strong>Carta de Pago</strong> con el detalle de la operacion: '
    + 'expediente, monto y periodo.</p>'
    + '<p>Le solicitamos que <strong>firme la carta adjunta y nos la remita a la brevedad</strong>. '
    + 'Hasta tanto no recibamos su conformidad firmada, no podremos proceder con nuevas transferencias.</p>'
    + '<p>Atentamente,<br><strong>Equipo de Incumplimientos - SISTEMA FINAER S.A.</strong>'
    + '<br>incumplimientos@finaersa.com.ar</p>';

  const htmlB64 = Buffer.from(htmlBody, 'utf8').toString('base64').match(/.{1,76}/g).join('\r\n');
  const pdfChunked = pdfBase64.match(/.{1,76}/g).join('\r\n');

  const mime = [
    'MIME-Version: 1.0',
    `From: Equipo Incumplimientos FINAER <${FROM_EMAIL}>`,
    `To: ${toEmail}`,
    'Subject: Carta de pago FINAER - Accion requerida',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlB64,
    '',
    `--${boundary}`,
    'Content-Type: application/pdf',
    `Content-Disposition: attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    'Content-Transfer-Encoding: base64',
    '',
    pdfChunked,
    '',
    `--${boundary}--`
  ].join('\r\n');

  return new Promise((resolve, reject) => {
    let sock = null;
    let tlsSock = null;
    let lineBuffer = '';
    let smtpState = 'GREETING';

    const timer = setTimeout(() => reject(new Error('SMTP timeout (25s) en estado: ' + smtpState)), 25000);

    const activeSock = () => tlsSock || sock;
    const write = (line) => activeSock().write(line + '\r\n');

    const onLine = (line) => {
      if (!line || line.length < 3) return;
      if (line[3] === '-') return; // multi-line intermediate

      const code = parseInt(line.slice(0, 3), 10);
      if (code >= 400) {
        clearTimeout(timer);
        return reject(new Error(`SMTP error [${smtpState}]: ${line}`));
      }

      if (smtpState === 'GREETING' && code === 220) {
        smtpState = 'EHLO1'; write('EHLO finaer-custom-code');
      } else if (smtpState === 'EHLO1' && code === 250) {
        smtpState = 'STARTTLS'; write('STARTTLS');
      } else if (smtpState === 'STARTTLS' && code === 220) {
        sock.removeAllListeners('data');
        tlsSock = tls.connect({ socket: sock, servername: SMTP_HOST }, () => {
          smtpState = 'EHLO2';
          tlsSock.write('EHLO finaer-custom-code\r\n');
        });
        tlsSock.on('data', onData);
        tlsSock.on('error', (e) => { clearTimeout(timer); reject(e); });
      } else if (smtpState === 'EHLO2' && code === 250) {
        smtpState = 'AUTH'; write('AUTH LOGIN');
      } else if (smtpState === 'AUTH' && code === 334) {
        smtpState = 'USER'; write(Buffer.from(smtpUser).toString('base64'));
      } else if (smtpState === 'USER' && code === 334) {
        smtpState = 'PASS'; write(Buffer.from(smtpPass).toString('base64'));
      } else if (smtpState === 'PASS' && code === 235) {
        smtpState = 'MAIL'; write(`MAIL FROM:<${FROM_EMAIL}>`);
      } else if (smtpState === 'MAIL' && code === 250) {
        smtpState = 'RCPT'; write(`RCPT TO:<${toEmail}>`);
      } else if (smtpState === 'RCPT' && code === 250) {
        smtpState = 'DATA'; write('DATA');
      } else if (smtpState === 'DATA' && code === 354) {
        smtpState = 'BODY';
        activeSock().write(mime + '\r\n.\r\n');
      } else if (smtpState === 'BODY' && code === 250) {
        smtpState = 'QUIT'; write('QUIT');
      } else if (smtpState === 'QUIT' && code === 221) {
        clearTimeout(timer);
        activeSock().destroy();
        resolve();
      }
    };

    const onData = (data) => {
      lineBuffer += data.toString('ascii');
      const lines = lineBuffer.split('\r\n');
      lineBuffer = lines.pop();
      for (const line of lines) onLine(line);
    };

    sock = net.createConnection({ host: SMTP_HOST, port: SMTP_PORT });
    sock.on('data', onData);
    sock.on('error', (e) => { clearTimeout(timer); reject(e); });
    sock.on('close', () => {
      if (smtpState !== 'QUIT') {
        clearTimeout(timer);
        reject(new Error('Conexion SMTP cerrada inesperadamente en estado: ' + smtpState));
      }
    });
  });
}

exports.main = async (event, callback) => {
  const fields = event.inputFields;
  let docId = null;
  let gToken = null;

  try {
    gToken = await getGoogleToken();
    const titulo = `Carta de Pago - ${fields.nombre_y_apellido_del_inquilino || fields.nro_expediente}`;
    docId = await copiarTemplate(gToken, titulo);
    await reemplazarPlaceholders(gToken, docId, fields);
    const pdfBase64 = await exportarPdf(gToken, docId);
    const nombrePdf = `${fields.nombre_y_apellido_del_inquilino || 'Inquilino'} - ${fields.nro_expediente || ''} - ${fields.periodo_de_deuda || ''}`;
    await guardarPdfEnDrive(gToken, pdfBase64, nombrePdf);
    await eliminarArchivo(gToken, docId);
    docId = null;
    await enviarEmailSmtp(pdfBase64, fields);

    // Marcar carta como enviada en el ticket
    const ticketId = event.object.objectId;
    if (ticketId && process.env.token) {
      const hoy = new Date();
      hoy.setUTCHours(0, 0, 0, 0);
      try {
        await req({
          hostname: 'api.hubapi.com',
          path: `/crm/v3/objects/tickets/${ticketId}`,
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + process.env.token,
            'Content-Type': 'application/json'
          }
        }, { properties: { carta_de_pago_enviada: hoy.getTime().toString() } });
      } catch (_) {}
    }

    callback({ outputFields: { resultado: 'ok', mensaje: 'Carta de pago enviada con adjunto' } });
  } catch (err) {
    if (docId && gToken) {
      try { await eliminarArchivo(gToken, docId); } catch (_) {}
    }
    callback({ outputFields: { resultado: 'error', mensaje: err.message } });
  }
};
