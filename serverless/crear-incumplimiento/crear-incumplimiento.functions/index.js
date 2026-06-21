const https = require('https');

const PIPELINE_ID  = '3353793749';
const STAGE_NUEVO  = '4596051183';

const DEUDA_MAP = {
  'Alquiler': 'deuda_alquiler',
  'Expensas': 'deuda_expensas',
  'Luz':      'deuda_luz',
  'Gas':      'deuda_gas',
  'ABL':      'deuda_abl',
  'Aysa':     'deuda_aysa'
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function hsRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req  = https.request({
      hostname: 'api.hubapi.com', path, method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type':  'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : { 'Content-Length': 0 })
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

async function findOrCreateContact(d, token) {
  const search = await hsRequest('POST', '/crm/v3/objects/contacts/search', {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: d.email }] }],
    properties: ['email'],
    limit: 1
  }, token);

  if (search.body.results && search.body.results.length > 0) {
    return search.body.results[0].id;
  }

  const create = await hsRequest('POST', '/crm/v3/objects/contacts', {
    properties: {
      email:     d.email,
      firstname: d.firstname,
      lastname:  d.lastname,
      phone:     d.phone || ''
    }
  }, token);

  if (!create.body.id) throw new Error('No se pudo crear el contacto: ' + JSON.stringify(create.body));
  return create.body.id;
}

exports.main = async (context, sendResponse) => {
  if (context.method === 'OPTIONS') {
    return sendResponse({ statusCode: 200, headers: CORS, body: '' });
  }

  const token = process.env.HUBSPOT_TOKEN;
  const d     = typeof context.body === 'string' ? JSON.parse(context.body) : context.body;

  if (!d || !d.email || !d.nombre_y_apellido_del_inquilino) {
    return sendResponse({ statusCode: 400, headers: CORS, body: { ok: false, error: 'Faltan campos obligatorios' } });
  }

  try {
    // 1 — Buscar o crear contacto
    const contactId = await findOrCreateContact(d, token);

    // 2 — Construir propiedades del ticket
    const props = {
      subject:                          'Incumplimiento — ' + d.nombre_y_apellido_del_inquilino + (d.numero_garantia ? ' (' + d.numero_garantia + ')' : ''),
      hs_pipeline:                      PIPELINE_ID,
      hs_pipeline_stage:                STAGE_NUEVO,
      nombre_y_apellido_del_inquilino:  d.nombre_y_apellido_del_inquilino,
      dni_inquilino:                    d.dni_inquilino       || '',
      tipo_de_incumplimiento:           d.tipo_de_incumplimiento || '',
      fecha_desde_que_adeuda:           d.fecha_desde_que_adeuda || '',
      content:                          d.content             || '',
      alias_cbu_impagos:                d.alias_cbu_impagos   || '',
      banco:                            d.banco               || '',
      nombre_y_apellido_del_propietario: d.nombre_y_apellido_del_propietario || ''
    };

    // Solo agrega montos para los tipos seleccionados
    const tipos = (d.tipo_de_incumplimiento || '').split(';').filter(Boolean);
    for (const tipo of tipos) {
      const campo = DEUDA_MAP[tipo];
      if (campo && d[campo]) props[campo] = d[campo];
    }

    // 3 — Crear ticket
    const ticketRes = await hsRequest('POST', '/crm/v3/objects/tickets', { properties: props }, token);
    if (!ticketRes.body.id) throw new Error('No se pudo crear el ticket: ' + JSON.stringify(ticketRes.body));
    const ticketId = ticketRes.body.id;

    // 4 — Asociar ticket ↔ contacto
    await hsRequest('PUT',
      '/crm/v4/objects/tickets/' + ticketId + '/associations/default/contacts/' + contactId,
      null, token
    );

    sendResponse({ statusCode: 200, headers: CORS, body: { ok: true, ticketId } });

  } catch (e) {
    sendResponse({ statusCode: 500, headers: CORS, body: { ok: false, error: e.message } });
  }
};
