// WF: Deudor Recurrente — Detección de 2 períodos consecutivos de alquiler impago
// Trigger: ticket creado/actualizado en pipeline 3353793749
//          con tipo_de_incumplimiento que contiene "Alquiler"
// Acción: si hay otro ticket del mismo contacto con periodo_de_deuda consecutivo,
//         marca clasificacion_deudor = 'deudor_recurrente' en ambos tickets
//         y en sus deals asociados (Mora 2)

const PIPELINE = '3353793749';

const MESES = {
  Enero:1, Febrero:2, Marzo:3, Abril:4, Mayo:5, Junio:6,
  Julio:7, Agosto:8, Septiembre:9, Octubre:10, Noviembre:11, Diciembre:12
};

function parsePeriodo(str) {
  if (!str) return null;
  const parts = str.trim().split(/\s*-\s*/);
  if (parts.length < 2) return null;
  const mes = MESES[parts[0].trim()];
  const anio = parseInt(parts[1].trim(), 10);
  if (!mes || !anio) return null;
  return anio * 12 + mes;
}

async function api(token, method, path, body) {
  const opts = {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch('https://api.hubapi.com' + path, opts);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(method + ' ' + path + ' → ' + resp.status + ': ' + text);
  }
  return resp.json();
}

exports.main = async (event, callback) => {
  const token = process.env.token;
  const ticketId = String(event.object.objectId);
  const periodoActual = event.inputFields['periodo_de_deuda'];
  const tipoActual = event.inputFields['tipo_de_incumplimiento'] || '';

  if (!periodoActual || !tipoActual.toLowerCase().includes('alquiler')) {
    return callback({ outputFields: {} });
  }

  const numActual = parsePeriodo(periodoActual);
  if (!numActual) return callback({ outputFields: {} });

  // 1. Obtener el contacto asociado al ticket actual
  const assocResp = await api(token, 'GET', `/crm/v4/objects/tickets/${ticketId}/associations/contacts`);
  const contactId = assocResp.results && assocResp.results[0] && assocResp.results[0].toObjectId;
  if (!contactId) return callback({ outputFields: {} });

  // 2. Traer todos los IDs de tickets asociados a ese contacto
  const ticketsAssocResp = await api(token, 'GET', `/crm/v4/objects/contacts/${contactId}/associations/tickets?limit=100`);
  const otrosIds = (ticketsAssocResp.results || [])
    .map(t => String(t.toObjectId))
    .filter(id => id !== ticketId);

  if (otrosIds.length === 0) return callback({ outputFields: {} });

  // 3. Batch GET propiedades de esos tickets
  const batchData = await api(token, 'POST', '/crm/v3/objects/tickets/batch/read', {
    inputs: otrosIds.slice(0, 50).map(id => ({ id })),
    properties: ['periodo_de_deuda', 'tipo_de_incumplimiento', 'hs_pipeline']
  });

  // 4. Filtrar: mismo pipeline, tipo alquiler, periodo consecutivo (|diff| === 1)
  const candidatos = (batchData.results || []).filter(t => {
    if (t.properties.hs_pipeline !== PIPELINE) return false;
    if (!(t.properties.tipo_de_incumplimiento || '').toLowerCase().includes('alquiler')) return false;
    const num = parsePeriodo(t.properties.periodo_de_deuda);
    return num && Math.abs(num - numActual) === 1;
  });

  if (candidatos.length === 0) return callback({ outputFields: {} });

  // 5. Marcar ambos tickets y sus deals asociados
  const idsAMarcar = [ticketId, ...candidatos.map(t => t.id)];

  for (const id of idsAMarcar) {
    await api(token, 'PATCH', `/crm/v3/objects/tickets/${id}`, {
      properties: { clasificacion_deudor: 'deudor_recurrente' }
    });

    const dealsResp = await api(token, 'GET', `/crm/v4/objects/tickets/${id}/associations/deals`);
    for (const deal of (dealsResp.results || [])) {
      await api(token, 'PATCH', `/crm/v3/objects/deals/${deal.toObjectId}`, {
        properties: { clasificacion_deudor: 'deudor_recurrente' }
      });
    }
  }

  callback({ outputFields: {} });
};
