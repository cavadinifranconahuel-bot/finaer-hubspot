/**
 * Crea los 3 WF de emails al inquilino para el proceso de incumplimientos
 * Mail 1: Notificación de incumplimiento (ticket Nuevo + email conocido)
 * Mail 2: Pago realizado (deal monto_desembolso conocido)
 * Mail 3: Carta documento (ticket Judicial + email conocido)
 */

const https = require('https');
const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = data.length;
    const req = https.request({ hostname: 'api.hubapi.com', path, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => resolve(JSON.parse(Buffer.concat(c).toString('utf8'))));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Códigos de los custom code actions ────────────────────────────────────────

const CODE_MAIL1 = `const hubspot = require('@hubspot/api-client');
exports.main = async (event, callback) => {
  const client = new hubspot.Client({ accessToken: process.env.token });
  try {
    const email = event.inputFields['email_inquilino'];
    const nombre = event.inputFields['nombre_y_apellido_del_inquilino'] || 'Inquilino';
    const ownerId = event.inputFields['hs_ticket_owner'];
    if (!email) { console.log('Sin email'); return callback({ outputFields: {} }); }
    let ownerName = 'Equipo Prejudicial';
    if (ownerId) {
      const owner = await client.crm.owners.ownersApi.getById(parseInt(ownerId));
      ownerName = ((owner.firstName || '') + ' ' + (owner.lastName || '')).trim();
    }
    await client.apiRequest({
      method: 'POST',
      path: '/marketing/v3/transactional/single-email/send',
      body: {
        emailId: 402444909777,
        message: { to: email },
        contactProperties: { firstname: nombre },
        customProperties: { owner_name: ownerName }
      }
    });
    console.log('Mail 1 enviado a:', email);
  } catch(e) { console.error('Error:', e.message); throw e; }
  callback({ outputFields: {} });
};`;

const CODE_MAIL2 = `const hubspot = require('@hubspot/api-client');
exports.main = async (event, callback) => {
  const client = new hubspot.Client({ accessToken: process.env.token });
  const dealId = event.object.objectId;
  try {
    const assocRes = await client.apiRequest({ method: 'GET', path: '/crm/v3/objects/deals/' + dealId + '/associations/tickets' });
    const assocData = await assocRes.json();
    if (!assocData.results || assocData.results.length === 0) {
      console.log('Sin ticket asociado');
      return callback({ outputFields: {} });
    }
    const ticketId = assocData.results[0].id;
    const ticket = await client.crm.tickets.basicApi.getById(ticketId, ['email_inquilino', 'nombre_y_apellido_del_inquilino', 'hs_ticket_owner']);
    const email = ticket.properties.email_inquilino;
    const nombre = ticket.properties.nombre_y_apellido_del_inquilino || 'Inquilino';
    const ownerId = ticket.properties.hs_ticket_owner;
    if (!email) { console.log('Sin email en ticket'); return callback({ outputFields: {} }); }
    let ownerName = 'Equipo Prejudicial';
    if (ownerId) {
      const owner = await client.crm.owners.ownersApi.getById(parseInt(ownerId));
      ownerName = ((owner.firstName || '') + ' ' + (owner.lastName || '')).trim();
    }
    await client.apiRequest({
      method: 'POST',
      path: '/marketing/v3/transactional/single-email/send',
      body: {
        emailId: 402418516182,
        message: { to: email },
        contactProperties: { firstname: nombre },
        customProperties: { owner_name: ownerName }
      }
    });
    console.log('Mail 2 enviado a:', email);
  } catch(e) { console.error('Error:', e.message); throw e; }
  callback({ outputFields: {} });
};`;

const CODE_MAIL3 = `const hubspot = require('@hubspot/api-client');
exports.main = async (event, callback) => {
  const client = new hubspot.Client({ accessToken: process.env.token });
  try {
    const email = event.inputFields['email_inquilino'];
    const nombre = event.inputFields['nombre_y_apellido_del_inquilino'] || 'Inquilino';
    const ownerId = event.inputFields['hs_ticket_owner'];
    if (!email) { console.log('Sin email'); return callback({ outputFields: {} }); }
    let ownerName = 'Equipo Prejudicial';
    if (ownerId) {
      const owner = await client.crm.owners.ownersApi.getById(parseInt(ownerId));
      ownerName = ((owner.firstName || '') + ' ' + (owner.lastName || '')).trim();
    }
    await client.apiRequest({
      method: 'POST',
      path: '/marketing/v3/transactional/single-email/send',
      body: {
        emailId: 402444909780,
        message: { to: email },
        contactProperties: { firstname: nombre },
        customProperties: { owner_name: ownerName }
      }
    });
    console.log('Mail 3 enviado a:', email);
  } catch(e) { console.error('Error:', e.message); throw e; }
  callback({ outputFields: {} });
};`;

// ── Función para construir el payload del WF ───────────────────────────────────

function makeWF(name, objectTypeId, filters, code) {
  return {
    name,
    type: 'PLATFORM_FLOW',
    flowType: 'WORKFLOW',
    objectTypeId,
    startActionId: '1',
    isEnabled: false,
    enrollmentCriteria: {
      shouldReEnroll: false,
      unEnrollObjectsNotMeetingCriteria: false,
      type: 'LIST_BASED',
      listFilterBranch: {
        filterBranchType: 'OR',
        filterBranchOperator: 'OR',
        filterBranches: [{ filterBranchType: 'AND', filterBranchOperator: 'AND', filterBranches: [], filters }],
        filters: []
      },
      reEnrollmentTriggersFilterBranches: []
    },
    actions: [{
      actionId: '1',
      actionTypeId: '0-8',
      actionTypeVersion: 0,
      type: 'SINGLE_CONNECTION',
      fields: { codeType: 'JAVASCRIPT', code, secretNames: ['token'] }
    }]
  };
}

// ── Definición de los 3 workflows ─────────────────────────────────────────────

const workflows = [
  {
    name: 'WF — Mail 1 Notificacion Incumplimiento al Inquilino',
    objectTypeId: '0-5',
    filters: [
      { filterType: 'PROPERTY', property: 'hs_pipeline', operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', includeObjectsWithNoValueSet: false, values: ['3353793749'] } },
      { filterType: 'PROPERTY', property: 'hs_pipeline_stage', operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', includeObjectsWithNoValueSet: false, values: ['4596051183'] } }
    ],
    code: CODE_MAIL1
  },
  {
    name: 'WF — Mail 2 Pago Realizado al Inquilino',
    objectTypeId: '0-3',
    filters: [
      { filterType: 'PROPERTY', property: 'pipeline', operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', includeObjectsWithNoValueSet: false, values: ['3403406575'] } }
    ],
    code: CODE_MAIL2
  },
  {
    name: 'WF — Mail 3 Carta Documento al Inquilino',
    objectTypeId: '0-5',
    filters: [
      { filterType: 'PROPERTY', property: 'hs_pipeline', operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', includeObjectsWithNoValueSet: false, values: ['3353793749'] } },
      { filterType: 'PROPERTY', property: 'hs_pipeline_stage', operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', includeObjectsWithNoValueSet: false, values: ['4596051186'] } }
    ],
    code: CODE_MAIL3
  }
];

// ── Crear los workflows ────────────────────────────────────────────────────────

async function main() {
  for (const w of workflows) {
    const res = await api('POST', '/automation/v4/flows', makeWF(w.name, w.objectTypeId, w.filters, w.code));
    if (res.id) {
      console.log('✅', w.name);
      console.log('   ID:', res.id);
    } else {
      console.log('❌', w.name);
      console.log('   Error:', JSON.stringify(res).slice(0, 300));
    }
  }
}

main().catch(e => console.error('Error fatal:', e.message));
