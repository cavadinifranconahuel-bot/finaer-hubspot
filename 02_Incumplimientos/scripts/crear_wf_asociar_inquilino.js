/**
 * Crea el WF que asocia automáticamente el inquilino al ticket de incumplimiento.
 *
 * Trigger: Ticket creado en pipeline Incumplimientos (3353793749)
 * Acción:  Custom code que busca el contacto por DNI, copia su email al ticket
 *          y asocia formalmente el contacto al ticket.
 */

const https = require('https');
const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = data.length;
    const req = https.request({ hostname: 'api.hubapi.com', path, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => resolve(JSON.parse(Buffer.concat(c).toString())));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const CODE = `const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  const hubspotClient = new hubspot.Client({ accessToken: process.env.token });
  const ticketId = event.object.objectId;

  try {
    const dniRaw = event.inputFields['dni_inquilino'];
    if (!dniRaw) {
      console.log('DNI vacío — sin acción');
      return callback({ outputFields: {} });
    }

    const dni = String(parseInt(dniRaw));

    // Buscar contacto por numero_de_documento
    const searchRes = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'numero_de_documento',
          operator: 'EQ',
          value: dni
        }]
      }],
      properties: ['email', 'firstname', 'lastname', 'numero_de_documento'],
      limit: 1
    });

    if (!searchRes.results || searchRes.results.length === 0) {
      console.log('Contacto no encontrado para DNI:', dni);
      return callback({ outputFields: {} });
    }

    const contact = searchRes.results[0];
    const contactId = contact.id;
    const email = contact.properties.email;

    console.log('Contacto encontrado:', contactId, '| Email:', email);

    // Copiar email al ticket
    if (email) {
      await hubspotClient.crm.tickets.basicApi.update(ticketId, {
        properties: { email_inquilino: email }
      });
      console.log('Email copiado al ticket');
    }

    // Asociar contacto al ticket
    await hubspotClient.apiRequest({
      method: 'PUT',
      path: '/crm/v3/associations/tickets/contacts/batch/create',
      body: {
        inputs: [{
          from: { id: ticketId },
          to: { id: contactId },
          type: 'ticket_to_contact'
        }]
      }
    });
    console.log('Contacto asociado al ticket');

  } catch(e) {
    console.error('Error:', e.message);
    throw e;
  }

  callback({ outputFields: {} });
};`;

const WORKFLOW = {
  name: 'WF — Asociar Inquilino al Ticket (Incumplimientos)',
  type: 'PLATFORM_FLOW',
  flowType: 'WORKFLOW',
  objectTypeId: '0-5', // Tickets
  startActionId: '1',
  isEnabled: false,
  enrollmentCriteria: {
    shouldReEnroll: false,
    unEnrollObjectsNotMeetingCriteria: false,
    type: 'LIST_BASED',
    listFilterBranch: {
      filterBranchType: 'OR',
      filterBranchOperator: 'OR',
      filterBranches: [{
        filterBranchType: 'AND',
        filterBranchOperator: 'AND',
        filterBranches: [],
        filters: [{
          filterType: 'PROPERTY',
          property: 'hs_pipeline',
          operation: {
            operationType: 'ENUMERATION',
            operator: 'IS_ANY_OF',
            includeObjectsWithNoValueSet: false,
            values: ['3353793749']
          }
        }]
      }],
      filters: []
    },
    reEnrollmentTriggersFilterBranches: []
  },
  actions: [{
    actionId: '1',
    actionTypeId: '0-8',
    actionTypeVersion: 0,
    type: 'SINGLE_CONNECTION',
    fields: {
      codeType: 'JAVASCRIPT',
      code: CODE,
      secretNames: ['token']
    }
  }]
};

async function main() {
  console.log('Creando WF de asociación de inquilino...');
  const res = await api('POST', '/automation/v4/flows', WORKFLOW);
  if (res.id) {
    console.log('✅ Workflow creado. ID:', res.id);
    console.log('\nPasos manuales en HubSpot UI:');
    console.log('1. Abrir el WF y agregar input: dni_inquilino → DNI Inquilino');
    console.log('2. Seleccionar secreto: token');
    console.log('3. Activar el workflow');
  } else {
    console.log('Error:', JSON.stringify(res, null, 2));
  }
}

main().catch(e => console.error(e.message));
