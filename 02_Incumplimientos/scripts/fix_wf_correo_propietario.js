const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();

const codigo = `const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  const client = new hubspot.Client({ accessToken: process.env.token });
  const ticketId = String(event.object.objectId);

  const LABELS_EXCLUIR = [33, 35, 43]; // Inquilino, Cogarante, Solicitante
  const LABELS_PREFERIR = [31, 41];    // Propietario, Vendedor Inmobiliaria

  try {
    // Obtener asociaciones con labels
    const asocs = await client.apiRequest({
      method: 'GET',
      path: '/crm/v4/objects/tickets/' + ticketId + '/associations/contacts'
    });

    const contactIds = [...new Set((asocs.results || []).map(a => String(a.toObjectId)))];
    if (!contactIds.length) {
      console.log('Sin contactos - sin accion');
      return callback({ outputFields: {} });
    }

    const labelsPorContacto = {};
    for (const a of (asocs.results || [])) {
      const typeIds = (a.associationTypes || []).filter(t => t.category === 'USER_DEFINED').map(t => t.typeId);
      labelsPorContacto[String(a.toObjectId)] = typeIds;
    }

    // Leer emails de los contactos
    const contactsData = await client.crm.contacts.batchApi.read({
      inputs: contactIds.map(id => ({ id })),
      properties: ['email']
    });

    const conEmail = (contactsData.results || []).filter(c => c.properties.email);

    // 1. Preferir Propietario (31) o Vendedor Inmobiliaria (41)
    let emailPropietario = conEmail.find(c => {
      const labels = labelsPorContacto[String(c.id)] || [];
      return labels.some(l => LABELS_PREFERIR.includes(l));
    })?.properties.email;

    // 2. Si no hay, tomar el que NO tenga labels de Inquilino/Cogarante/Solicitante
    if (!emailPropietario) {
      emailPropietario = conEmail.find(c => {
        const labels = labelsPorContacto[String(c.id)] || [];
        return !labels.some(l => LABELS_EXCLUIR.includes(l));
      })?.properties.email;
    }

    if (!emailPropietario) {
      console.log('No se encontro email del propietario');
      return callback({ outputFields: {} });
    }

    await client.crm.tickets.basicApi.update(ticketId, {
      properties: { correo_del_propietario: emailPropietario }
    });

    console.log('Correo propietario: ' + emailPropietario);

  } catch (e) {
    console.error('Error:', e.message);
    throw e;
  }

  callback({ outputFields: {} });
};`;

const payload = {
  revisionId: '1',
  name: 'WF - Correo Propietario en Pago en Proceso (Incumplimientos)',
  objectTypeId: '0-5',
  flowType: 'WORKFLOW',
  type: 'PLATFORM_FLOW',
  isEnabled: false,
  startActionId: '1',
  nextAvailableActionId: '3',
  actions: [
    {
      actionId: '1',
      actionTypeVersion: 0,
      actionTypeId: '0-1',
      connection: { edgeType: 'STANDARD', nextActionId: '2' },
      fields: { delta: '2', time_unit: 'MINUTES' },
      type: 'SINGLE_CONNECTION'
    },
    {
      actionId: '2',
      secretNames: ['token'],
      sourceCode: codigo,
      runtime: 'NODE20X',
      inputFields: [],
      outputFields: [],
      type: 'CUSTOM_CODE'
    }
  ],
  enrollmentCriteria: {
    shouldReEnroll: false,
    listFilterBranch: {
      filterBranches: [{
        filterBranches: [],
        filters: [
          { property: 'hs_pipeline', operation: { operator: 'IS_ANY_OF', includeObjectsWithNoValueSet: false, values: ['3353793749'], operationType: 'ENUMERATION' }, filterType: 'PROPERTY' },
          { property: 'hs_pipeline_stage', operation: { operator: 'IS_ANY_OF', includeObjectsWithNoValueSet: false, values: ['4596051185'], operationType: 'ENUMERATION' }, filterType: 'PROPERTY' },
          { property: 'correo_del_propietario', operation: { operator: 'IS_UNKNOWN', includeObjectsWithNoValueSet: true, operationType: 'ALL_PROPERTY' }, filterType: 'PROPERTY' }
        ],
        filterBranchType: 'AND',
        filterBranchOperator: 'AND'
      }],
      filters: [],
      filterBranchType: 'OR',
      filterBranchOperator: 'OR'
    },
    reEnrollmentTriggersFilterBranches: [{
      filterBranches: [],
      filters: [{
        property: 'hs_name',
        operation: { operator: 'IS_EQUAL_TO', includeObjectsWithNoValueSet: false, value: 'hs_pipeline_stage', operationType: 'STRING' },
        filterType: 'PROPERTY'
      }, {
        property: 'hs_value',
        operation: { operator: 'IS_ANY_OF', includeObjectsWithNoValueSet: false, values: ['4596051185'], operationType: 'ENUMERATION' },
        filterType: 'PROPERTY'
      }],
      filterBranchType: 'AND',
      filterBranchOperator: 'AND'
    }],
    unEnrollObjectsNotMeetingCriteria: false,
    type: 'LIST_BASED'
  }
};

fetch('https://api.hubapi.com/automation/v4/flows/4320275682', {
  method: 'PUT',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(r => r.json()).then(d => {
  if (d.id) console.log('WF actualizado. ID:', d.id);
  else console.error('Error:', JSON.stringify(d, null, 2));
}).catch(console.error);
