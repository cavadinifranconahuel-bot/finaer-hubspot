/**
 * Envío masivo de emails judiciales — FINAER
 *
 * Uso:
 *   node send_emails.js --template ejecucion --file "ruta/al/archivo.xls"
 *   node send_emails.js --template desalojo  --file "ruta/al/archivo.xls"
 *
 * Dry-run (ver qué se va a mandar sin enviar nada):
 *   node send_emails.js --template ejecucion --file "..." --dry-run
 *
 * Variables de entorno requeridas:
 *   HS_SMTP_USER  — usuario SMTP de HubSpot
 *   HS_SMTP_PASS  — contraseña SMTP de HubSpot
 */

const XLSX  = require('./node_modules/xlsx');
const fs    = require('fs');
const path  = require('path');
const net   = require('net');
const tls   = require('tls');

// ── Configuración ────────────────────────────────────────────────────────────

const SMTP_HOST  = 'smtp.hubapi.com';
const SMTP_PORT  = 587;
const FROM_EMAIL = 'judiciales@finaersa.com.ar';
const FROM_NAME  = 'Área de Judiciales - FINAER';
const SUBJECT    = 'Comunicación Área de Judiciales - SISTEMA FINAER S.A.';
const DELAY_MS   = 1500; // pausa entre envíos para no saturar SMTP

const TEMPLATE_FILES = {
  ejecucion: path.join(__dirname, 'templates', 'Template_Ejecucion.html'),
  desalojo:  path.join(__dirname, 'templates', 'Template_Desalojo.html'),
};

// Emails inválidos que el área carga como placeholder cuando no tienen dato
const EMAILS_INVALIDOS = new Set([
  'nousa@nousa.com',
  'notiene@notiene.com',
  'notiene@nousa.com',
  'nousa@nousa.com.ar',
  'noposee@noposee.com',
  'notiene@notiene.com.ar',
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function emailValido(email) {
  if (!email || typeof email !== 'string') return false;
  const e = email.trim().toLowerCase();
  if (EMAILS_INVALIDOS.has(e)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Lectura del Excel ─────────────────────────────────────────────────────────

function leerDestinatarios(filePath, tipo) {
  const wb   = XLSX.readFile(filePath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  const lista = [];

  for (const row of rows) {
    const ref = tipo === 'desalojo'
      ? String(row['EXPEDIENTE'] || '').trim()
      : String(row['Solicitud']  || '').trim();

    if (!ref) continue;

    const candidatos = [
      { email: row['Mail'],                nombre: row['Solicitante']       },
      { email: row['Mail Co-Solicitante 1'], nombre: row['Co-Solicitante 1'] },
      { email: row['Mail Co-Solicitante 2'], nombre: row['Co-Solicitante 2'] },
    ];

    for (const c of candidatos) {
      const email = String(c.email || '').trim();
      if (emailValido(email)) {
        lista.push({
          email:  email.toLowerCase(),
          nombre: String(c.nombre || '').trim(),
          ref,
          solicitud: String(row['Solicitud'] || '').trim(),
        });
      }
    }
  }

  return lista;
}

// ── Envío SMTP ────────────────────────────────────────────────────────────────

function enviarSMTP(toEmail, htmlBody) {
  const smtpUser = process.env.HS_SMTP_USER;
  const smtpPass = process.env.HS_SMTP_PASS;
  if (!smtpUser || !smtpPass) throw new Error('HS_SMTP_USER o HS_SMTP_PASS no definidos');

  const boundary = 'FINAER_JUD_' + Date.now().toString(36);
  const htmlB64  = Buffer.from(htmlBody, 'utf8').toString('base64').match(/.{1,76}/g).join('\r\n');

  const mime = [
    'MIME-Version: 1.0',
    `From: ${FROM_NAME} <${FROM_EMAIL}>`,
    `To: ${toEmail}`,
    `Subject: ${SUBJECT}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlB64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  return new Promise((resolve, reject) => {
    let sock = null;
    let tlsSock = null;
    let lineBuffer = '';
    let smtpState = 'GREETING';

    const timer = setTimeout(
      () => reject(new Error('SMTP timeout (25s) en estado: ' + smtpState)),
      25000
    );

    const activeSock = () => tlsSock || sock;
    const write = (line) => activeSock().write(line + '\r\n');

    const onLine = (line) => {
      if (!line || line.length < 3) return;
      if (line[3] === '-') return;

      const code = parseInt(line.slice(0, 3), 10);
      if (code >= 400) {
        clearTimeout(timer);
        return reject(new Error(`SMTP error [${smtpState}]: ${line}`));
      }

      if      (smtpState === 'GREETING' && code === 220) { smtpState = 'EHLO1';    write('EHLO finaer-judiciales'); }
      else if (smtpState === 'EHLO1'    && code === 250) { smtpState = 'STARTTLS'; write('STARTTLS'); }
      else if (smtpState === 'STARTTLS' && code === 220) {
        sock.removeAllListeners('data');
        tlsSock = tls.connect({ socket: sock, servername: SMTP_HOST }, () => {
          smtpState = 'EHLO2';
          tlsSock.write('EHLO finaer-judiciales\r\n');
        });
        tlsSock.on('data', onData);
        tlsSock.on('error', (e) => { clearTimeout(timer); reject(e); });
      }
      else if (smtpState === 'EHLO2' && code === 250) { smtpState = 'AUTH'; write('AUTH LOGIN'); }
      else if (smtpState === 'AUTH'  && code === 334) { smtpState = 'USER'; write(Buffer.from(smtpUser).toString('base64')); }
      else if (smtpState === 'USER'  && code === 334) { smtpState = 'PASS'; write(Buffer.from(smtpPass).toString('base64')); }
      else if (smtpState === 'PASS'  && code === 235) { smtpState = 'MAIL'; write(`MAIL FROM:<${FROM_EMAIL}>`); }
      else if (smtpState === 'MAIL'  && code === 250) { smtpState = 'RCPT'; write(`RCPT TO:<${toEmail}>`); }
      else if (smtpState === 'RCPT'  && code === 250) { smtpState = 'DATA'; write('DATA'); }
      else if (smtpState === 'DATA'  && code === 354) {
        smtpState = 'BODY';
        activeSock().write(mime + '\r\n.\r\n');
      }
      else if (smtpState === 'BODY'  && code === 250) { smtpState = 'QUIT'; write('QUIT'); }
      else if (smtpState === 'QUIT'  && code === 221) {
        clearTimeout(timer);
        activeSock().destroy();
        resolve();
      }
    };

    const onData = (data) => {
      lineBuffer += data.toString('ascii');
      const lines = lineBuffer.split('\r\n');
      lineBuffer  = lines.pop();
      for (const line of lines) onLine(line);
    };

    sock = net.createConnection({ host: SMTP_HOST, port: SMTP_PORT });
    sock.on('data',  onData);
    sock.on('error', (e) => { clearTimeout(timer); reject(e); });
    sock.on('close', () => {
      if (smtpState !== 'QUIT') {
        clearTimeout(timer);
        reject(new Error('Conexión SMTP cerrada inesperadamente en estado: ' + smtpState));
      }
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args     = process.argv.slice(2);
  const tipo     = args[args.indexOf('--template') + 1]?.toLowerCase();
  const filePath = args[args.indexOf('--file') + 1];
  const dryRun   = args.includes('--dry-run');

  if (!tipo || !['ejecucion', 'desalojo'].includes(tipo)) {
    console.error('Error: --template debe ser "ejecucion" o "desalojo"');
    process.exit(1);
  }
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Error: --file no encontrado:', filePath);
    process.exit(1);
  }

  const templatePath = TEMPLATE_FILES[tipo];
  if (!fs.existsSync(templatePath)) {
    console.error('Template no encontrado en:', templatePath);
    console.error('Copiá los HTML a la carpeta templates/ dentro de 09_Judiciales/');
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  const destinatarios = leerDestinatarios(filePath, tipo);

  console.log(`\nTemplate:      ${tipo.toUpperCase()}`);
  console.log(`Archivo:       ${filePath}`);
  console.log(`Destinatarios: ${destinatarios.length} emails válidos`);
  if (dryRun) console.log(`Modo:          DRY-RUN (no se envía nada)\n`);
  else        console.log(`Modo:          ENVÍO REAL\n`);

  // Vista previa de los primeros 5
  destinatarios.slice(0, 5).forEach((d, i) =>
    console.log(`  ${i + 1}. ${d.email} — ${d.nombre} — ref: ${d.ref.slice(0, 60)}`)
  );
  if (destinatarios.length > 5) console.log(`  ... y ${destinatarios.length - 5} más`);
  console.log('');

  if (dryRun) {
    console.log('Dry-run finalizado. Revisá la lista y corré sin --dry-run para enviar.');
    return;
  }

  let enviados = 0, fallidos = 0;
  const errores = [];

  for (const d of destinatarios) {
    const html = templateHtml.replace(/\[\[ref\]\]/g, d.ref);
    try {
      await enviarSMTP(d.email, html);
      console.log(`✅ ${d.email} (${d.solicitud || d.ref.slice(0, 30)})`);
      enviados++;
    } catch (err) {
      console.error(`❌ ${d.email}: ${err.message}`);
      errores.push({ email: d.email, ref: d.ref, error: err.message });
      fallidos++;
    }
    if (enviados + fallidos < destinatarios.length) await sleep(DELAY_MS);
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Enviados: ${enviados} | Fallidos: ${fallidos}`);

  if (errores.length > 0) {
    const logPath = path.join(__dirname, `errores_${tipo}_${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(errores, null, 2));
    console.log(`Log de errores: ${logPath}`);
  }
}

main().catch(console.error);
