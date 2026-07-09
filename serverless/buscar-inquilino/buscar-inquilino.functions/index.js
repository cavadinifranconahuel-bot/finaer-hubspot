const https = require('https');

const STAGES_ACTIVAS = new Set([
  'closedlost',
  '1934076144',
  '1934076145',
]);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function hsGet(path, token) {
  return new Promise((resolve, reject) => {
    https.request({
      hostname: 'api.hubapi.com', path, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(c).toString())); }
        catch (e) { resolve({}); }
      });
    }).on('error', reject).end();
  });
}

function hsPost(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.hubapi.com', path, method: 'POST',
      headers: {
        'Authorization':  'Bearer ' + token,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(c).toString())); }
        catch (e) { resolve({}); }
      });
    }).on('error', reject);
    req.write(data);
    req.end();
  });
}

exports.main = async (context, sendResponse) => {
  if (context.method === 'OPTIONS') {
    return sendResponse({ statusCode: 200, headers: CORS, body: '' });
  }

  const TOKEN = process.env.HUBSPOT_TOKEN;
  const dni   = (context.params.dni || '').trim().replace(/\D/g, '');

  if (!dni || dni.length < 7) {
    return sendResponse({
      statusCode: 400, headers: CORS,
      body: { error: 'DNI inválido.' }
    });
  }

  try {
    // FLUJO 1: buscar ticket existente por dni_inquilino
    const ticketSearch = await hsPost('/crm/v3/objects/tickets/search', {
      filterGroups: [{ filters: [{ propertyName: 'dni_inquilino', operator: 'EQ', value: dni }] }],
      properties: [
        'subject', 'tipo_de_incumplimiento', 'monto_total_de_la_deuda_acumulada',
        'direccion_del_inmueble', 'nombre_inmobiliaria', 'nombre_y_apellido_del_inquilino'
      ],
      sorts:  [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
      limit:  1
    }, TOKEN);

    if (ticketSearch.results && ticketSearch.results.length > 0) {
      const p = ticketSearch.results[0].properties;
      return sendResponse({
        statusCode: 200, headers: CORS,
        body: {
          flujo:       'existente',
          nombre:      p.nombre_y_apellido_del_inquilino || '—',
          dni,
          subject:     p.subject                          || '—',
          tipos:       p.tipo_de_incumplimiento           || '',
          monto_total: p.monto_total_de_la_deuda_acumulada || null,
          direccion:   p.direccion_del_inmueble            || null,
          inmobiliaria: p.nombre_inmobiliaria              || null
        }
      });
    }

    // FLUJO 2: no hay ticket — buscar contacto por nro_documento_txt (incumplimiento nuevo)
    const contactSearch = await hsPost('/crm/v3/objects/contacts/search', {
      filterGroups: [{ filters: [{ propertyName: 'nro_documento_txt', operator: 'EQ', value: dni }] }],
      properties: ['firstname', 'lastname'],
      limit: 1
    }, TOKEN);

    if (!contactSearch.results || contactSearch.results.length === 0) {
      return sendResponse({
        statusCode: 404, headers: CORS,
        body: { error: 'No encontramos ningún inquilino con ese DNI en nuestro sistema.' }
      });
    }

    const contact = contactSearch.results[0];
    const nombre  = [contact.properties.firstname, contact.properties.lastname]
                      .filter(Boolean).join(' ');

    // Buscar deal activo (número de garantía)
    const assoc   = await hsGet(`/crm/v3/objects/contacts/${contact.id}/associations/deals`, TOKEN);
    const dealIds = (assoc.results || []).map(r => r.id);
    let garantia  = null;

    if (dealIds.length) {
      const batch   = await hsPost('/crm/v3/objects/deals/batch/read', {
        inputs:     dealIds.map(id => ({ id })),
        properties: ['dealname', 'dealstage']
      }, TOKEN);
      const activos = (batch.results || []).filter(d => STAGES_ACTIVAS.has(d.properties.dealstage));
      if (activos.length) garantia = activos[0].properties.dealname || null;
    }

    return sendResponse({
      statusCode: 200, headers: CORS,
      body: { flujo: 'nuevo', nombre, dni, garantia }
    });

  } catch (e) {
    sendResponse({ statusCode: 500, headers: CORS, body: { error: e.message } });
  }
};
