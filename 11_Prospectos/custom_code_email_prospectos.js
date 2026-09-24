/**
 * custom_code_email_prospectos.js
 * Envía el "1er correo Prospectos" vía SMTP a contactos no-marketing.
 *
 * Secrets requeridos en el WF:
 *   SMTP_USER_PROSPECTOS  → HubSpot > Config > Correo > SMTP
 *   SMTP_PASS_PROSPECTOS  → HubSpot > Config > Correo > SMTP
 *
 * Input del WF: email → propiedad "Email" del contacto
 */

const net = require('net');
const tls = require('tls');

const SMTP_HOST  = 'smtp.hubapi.com';
const SMTP_PORT  = 587;
const FROM_NAME  = 'Comunicación Finaer';
const FROM_EMAIL = 'asesoramientos@finaersa.com.ar';
const SUBJECT    = '👉Ya calculaste tu garantía. ¿Avanzamos?';

const CTA_URL = 'https://www.finaersa.com.ar/solicitar-garantia?utm_source=own_media&utm_medium=mail&utm_campaign=activacion_leads';
const LOGO    = 'https://145725856.fs1.hubspotusercontent-eu1.net/hubfs/145725856/logos/logo-finaer.png';
const IMG1    = 'https://145725856.fs1.hubspotusercontent-eu1.net/hubfs/145725856/Mail-comu_Activacion%20Leads%201.jpg';
const IMG2    = 'https://145725856.fs1.hubspotusercontent-eu1.net/hubfs/145725856/Mail-comu_Activacion%20Leads%202.jpg';

const HTML_BODY = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
  <tr><td align="center" style="padding:20px 10px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr><td align="center" style="padding:20px;">
        <a href="${CTA_URL}"><img src="${LOGO}" alt="Finaer" width="200" height="75" style="display:block;border:0;"></a>
      </td></tr>
      <tr><td align="center" style="padding:0 20px 10px;">
        <a href="${CTA_URL}"><img src="${IMG1}" alt="Pensando en alquilar?" width="520" style="display:block;max-width:100%;border:0;"></a>
      </td></tr>
      <tr><td align="center" style="padding:10px 20px;">
        <a href="${CTA_URL}" style="display:inline-block;background:#197FC4;color:#ffffff;font-family:Arial,sans-serif;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:8px;">INICIÁ GRATIS TU SOLICITUD HOY</a>
      </td></tr>
      <tr><td align="center" style="padding:10px 20px 20px;">
        <a href="${CTA_URL}"><img src="${IMG2}" alt="Finaer" width="520" style="display:block;max-width:100%;border:0;"></a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

const PLAIN_TEXT = `Ya calculaste tu garantia. Avanzamos?\nInicia gratis tu solicitud Finaer: ${CTA_URL}`;

exports.main = async (event, callback) => {
  const smtpUser = process.env.SMTP_USER_PROSPECTOS;
  const smtpPass = process.env.SMTP_PASS_PROSPECTOS;
  const toEmail  = event.inputFields['email'];

  if (!smtpUser || !smtpPass) return callback({ outputFields: { resultado: 'ERROR: secrets SMTP no configurados' } });
  if (!toEmail)               return callback({ outputFields: { resultado: 'ERROR: email del contacto no disponible' } });

  const boundary      = 'FINAER_' + Date.now().toString(36);
  const subjectB64    = '=?UTF-8?B?' + Buffer.from(SUBJECT).toString('base64') + '?=';
  const htmlBase64    = Buffer.from(HTML_BODY).toString('base64').match(/.{1,76}/g).join('\r\n');

  const mime = [
    `From: ${FROM_NAME} <${FROM_EMAIL}>`,
    `To: ${toEmail}`,
    `Subject: ${subjectB64}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    PLAIN_TEXT,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlBase64,
    '',
    `--${boundary}--`
  ].join('\r\n');

  await new Promise((resolve, reject) => {
    let sock = null, tlsSock = null, lineBuffer = '';
    let smtpState = 'GREETING';
    const timer = setTimeout(() => reject(new Error('SMTP timeout en estado: ' + smtpState)), 25000);
    const activeSock = () => tlsSock || sock;
    const write = (line) => activeSock().write(line + '\r\n');

    const onData = (chunk) => {
      lineBuffer += chunk.toString();
      let idx;
      while ((idx = lineBuffer.indexOf('\r\n')) !== -1) {
        const line = lineBuffer.slice(0, idx);
        lineBuffer = lineBuffer.slice(idx + 2);
        if (line[3] === '-') continue;
        const code = parseInt(line.slice(0, 3), 10);
        if (code >= 400) { clearTimeout(timer); return reject(new Error(`SMTP [${smtpState}]: ${line}`)); }

        if      (smtpState === 'GREETING' && code === 220) { smtpState = 'EHLO1';    write('EHLO finaer-custom-code'); }
        else if (smtpState === 'EHLO1'    && code === 250) { smtpState = 'STARTTLS'; write('STARTTLS'); }
        else if (smtpState === 'STARTTLS' && code === 220) {
          sock.removeAllListeners('data');
          tlsSock = tls.connect({ socket: sock, servername: SMTP_HOST }, () => {
            smtpState = 'EHLO2';
            tlsSock.write('EHLO finaer-custom-code\r\n');
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
        else if (smtpState === 'DATA'  && code === 354) { smtpState = 'BODY'; activeSock().write(mime + '\r\n.\r\n'); }
        else if (smtpState === 'BODY'  && code === 250) { smtpState = 'QUIT'; write('QUIT'); }
        else if (smtpState === 'QUIT'  && code === 221) { clearTimeout(timer); activeSock().destroy(); resolve(); }
      }
    };

    sock = net.createConnection({ host: SMTP_HOST, port: SMTP_PORT });
    sock.on('data', onData);
    sock.on('error', (e) => { clearTimeout(timer); reject(e); });
    sock.on('close', () => {
      if (smtpState !== 'QUIT') { clearTimeout(timer); reject(new Error('SMTP cerrado en estado: ' + smtpState)); }
    });
  });

  callback({ outputFields: { resultado: 'Enviado a ' + toEmail } });
};
