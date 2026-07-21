// Custom Code — HubSpot Workflow
// Objeto: Ticket (Mora 1 — Incumplimientos)
// Trigger: ticket entra en etapa "Pago en proceso"
// Qué hace:
//   1. Lee los datos del ticket
//   2. Llama a la Lambda para generar el PDF del recibo
//   3. Envía el correo transaccional al propietario con el PDF adjunto
//
// Variables de entorno requeridas (configurar en el Custom Code de HubSpot):
//   HUBSPOT_ACCESS_TOKEN  — token de acceso al portal
//   LAMBDA_ENDPOINT       — URL del API Gateway de AWS (ej: https://xyz.execute-api.us-east-1.amazonaws.com/prod/generar-recibo)
//   TRANSACTIONAL_EMAIL_ID — ID del email template de HubSpot para el recibo

const hubspot = require('@hubspot/api-client');
const https   = require('https');

// ── Helpers ──────────────────────────────────────────────────────────────────

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data   = JSON.stringify(body);
    const req = https.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

exports.main = async (event, callback) => {
  const client   = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
  const ticketId = event.object.objectId;

  const PROPS = [
    'subject',
    'hs_pipeline_stage',
    'monto_total_de_la_deuda_acumulada',
    'monto_total_deuda_letras',
    'nombre_y_apellido_del_inquilino',
    'dni_inquilino',
    'deuda_alquiler',
    'deuda_expensas',
    'deuda_luz',
    'deuda_gas',
    'deuda_abl',
    'deuda_aysa',
    'punitorio_alquiler',
    'deuda_por_entrega_de_llaves',
    'direccion_del_inmueble',
    'fecha_de_inicio_de_contrato',
    'nombre_y_apellido_del_propietario',
    'correo_del_propietario',
  ];

  try {
    // 1. Leer ticket
    const ticket = await client.crm.tickets.basicApi.getById(ticketId, PROPS);
    const p = ticket.properties;

    const monto = parseFloat(String(p.monto_total_de_la_deuda_acumulada||'0').replace(/[^0-9.]/g,''))||0;

    // Fecha actual formateada
    const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const hoy = new Date();
    const fechaActual = `${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;

    // Armar filas de rubros para el email (HTML)
    const fmtMonto = v => (parseFloat(String(v||'0').replace(/[^0-9.]/g,''))||0).toLocaleString('es-AR');
    const RUBROS_MAP = [
      { key: 'deuda_alquiler',              label: 'Alquiler' },
      { key: 'deuda_expensas',              label: 'Expensas' },
      { key: 'deuda_luz',                   label: 'Luz' },
      { key: 'deuda_gas',                   label: 'Gas' },
      { key: 'deuda_abl',                   label: 'ABL' },
      { key: 'deuda_aysa',                  label: 'AYSA / Agua' },
      { key: 'punitorio_alquiler',          label: 'Punitorio alquiler' },
      { key: 'deuda_por_entrega_de_llaves', label: 'Entrega de llaves' },
    ];
    const rubrosHtml = RUBROS_MAP
      .filter(r => p[r.key] && parseFloat(p[r.key]) > 0)
      .map(r => `<tr><td>${r.label}</td><td>$${fmtMonto(p[r.key])}</td></tr>`)
      .join('');

    // 2. Llamar a Lambda para generar el PDF
    const lambdaPayload = {
      monto_total:          p.monto_total_de_la_deuda_acumulada,
      monto_letras:         p.monto_total_deuda_letras,
      nombre_inquilino:     p.nombre_y_apellido_del_inquilino,
      dni_inquilino:        p.dni_inquilino,
      direccion_inmueble:   p.direccion_del_inmueble || '—',
      fecha_inicio_contrato:p.fecha_de_inicio_de_contrato || '—',
      caracter_locador:     'Locador/a',
      deuda_alquiler:       p.deuda_alquiler,
      deuda_expensas:       p.deuda_expensas,
      deuda_luz:            p.deuda_luz,
      deuda_gas:            p.deuda_gas,
      deuda_abl:            p.deuda_abl,
      deuda_aysa:           p.deuda_aysa,
      punitorio_alquiler:   p.punitorio_alquiler,
      deuda_por_entrega_de_llaves: p.deuda_por_entrega_de_llaves,
    };

    const lambdaRes = await httpsPost(process.env.LAMBDA_ENDPOINT, lambdaPayload);

    if (!lambdaRes.pdf_base64) throw new Error('Lambda no devolvió pdf_base64');

    // 3. Enviar email transaccional con PDF adjunto
    const emailPayload = {
      emailId:    parseInt(process.env.TRANSACTIONAL_EMAIL_ID),
      message: {
        to:      p.correo_del_propietario,
        subject: `Recibo de pago — ${p.nombre_y_apellido_del_inquilino || p.subject}`,
        replyTo: 'incumplimientos@finaersa.com.ar',
      },
      customProperties: [
        { name: 'fecha_actual',        value: fechaActual },
        { name: 'nombre_propietario',  value: p.nombre_y_apellido_del_propietario || '' },
        { name: 'nombre_inquilino',    value: p.nombre_y_apellido_del_inquilino   || '' },
        { name: 'dni_inquilino',       value: p.dni_inquilino                     || '' },
        { name: 'monto',               value: fmtMonto(monto)                         },
        { name: 'monto_letras',        value: p.monto_total_deuda_letras          || '' },
        { name: 'direccion_inmueble',  value: p.direccion_del_inmueble            || '—' },
        { name: 'rubros_html',         value: rubrosHtml                               },
      ],
      attachments: [{
        fileName:    `Recibo_FINAER_${p.dni_inquilino || ticketId}.pdf`,
        fileContent: lambdaRes.pdf_base64,
        fileType:    'application/pdf',
        base64:      true,
      }],
    };

    const emailRes = await httpsPost(
      'https://api.hubapi.com/marketing/v3/transactional/single-email/send',
      emailPayload
    );

    console.log(`Ticket ${ticketId} | Email enviado a: ${p.correo_del_propietario}`);
    console.log('Respuesta API email:', JSON.stringify(emailRes).slice(0, 200));

    callback({ outputFields: { resultado: 'ok', email_destino: p.correo_electronico_del_propietario } });

  } catch (e) {
    console.error('Error:', e.message);
    callback({ outputFields: { resultado: 'error', detalle: e.message } });
  }
};
