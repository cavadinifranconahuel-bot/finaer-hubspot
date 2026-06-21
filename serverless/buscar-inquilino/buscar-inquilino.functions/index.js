const https = require('https');

// Stages activas del pipeline de garantías (excluye Finalizada, Rechazada, Baja)
const STAGES_ACTIVAS = new Set([
  'closedlost',   // Contrato de fianza firmado
  '1934076144',   // Contrato de locación firmado
  '1934076145',   // Legajo Completo
]);

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
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.main = async (context, sendResponse) => {
  const TOKEN = process.env.HUBSPOT_TOKEN;
  const dni = (context.params.dni || '').trim();

  if (!dni) {
    return sendResponse({ statusCode: 400, headers: CORS, body: { error: 'DNI requerido' } });
  }

  try {
    // 1. Buscar contacto por nro_documento_txt
    const search = await hsPost('/crm/v3/objects/contacts/search', {
      filterGroups: [{
        filters: [{ propertyName: 'nro_documento_txt', operator: 'EQ', value: dni }]
      }],
      properties: ['firstname', 'lastname', 'nro_documento_txt'],
      limit: 1
    }, TOKEN);

    if (!search.results || search.results.length === 0) {
      return sendResponse({
        statusCode: 404, headers: CORS,
        body: { error: 'No se encontró ningún inquilino con ese DNI.' }
      });
    }

    const contact = search.results[0];
    const nombre = ((contact.properties.firstname || '') + ' ' + (contact.properties.lastname || '')).trim();

    // 2. Obtener deals asociados al contacto
    const assoc = await hsGet(
      `/crm/v3/objects/contacts/${contact.id}/associations/deals`, TOKEN
    );
    const dealIds = (assoc.results || []).map(r => r.id);

    if (!dealIds.length) {
      return sendResponse({
        statusCode: 404, headers: CORS,
        body: { error: 'El inquilino no tiene garantías activas.' }
      });
    }

    // 3. Leer propiedades de todos los deals en batch
    const batch = await hsPost('/crm/v3/objects/deals/batch/read', {
      inputs: dealIds.map(id => ({ id })),
      properties: ['dealname', 'dealstage', 'domicilio_del_inmueble']
    }, TOKEN);

    // 4. Filtrar deals en etapas activas
    const activos = (batch.results || []).filter(d =>
      STAGES_ACTIVAS.has(d.properties.dealstage)
    );

    if (!activos.length) {
      return sendResponse({
        statusCode: 404, headers: CORS,
        body: { error: 'El inquilino no tiene garantías activas.' }
      });
    }

    // 5. Para cada deal activo, obtener la inmobiliaria asociada
    const garantias = await Promise.all(activos.map(async deal => {
      let inmobiliaria = null;
      try {
        const compAssoc = await hsGet(
          `/crm/v3/objects/deals/${deal.id}/associations/companies`, TOKEN
        );
        const compIds = (compAssoc.results || []).map(r => r.id);
        if (compIds.length) {
          const comp = await hsGet(
            `/crm/v3/objects/companies/${compIds[0]}?properties=name`, TOKEN
          );
          inmobiliaria = comp.properties?.name || null;
        }
      } catch (_) {}

      return {
        garantia:     deal.properties.dealname || deal.id,
        domicilio:    deal.properties.domicilio_del_inmueble || null,
        inmobiliaria: inmobiliaria
      };
    }));

    sendResponse({
      statusCode: 200, headers: CORS,
      body: { nombre, dni, garantias }
    });

  } catch (e) {
    sendResponse({ statusCode: 500, headers: CORS, body: { error: e.message } });
  }
};
