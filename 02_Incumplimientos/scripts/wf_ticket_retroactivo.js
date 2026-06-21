const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();

const codigo = `const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  const client = new hubspot.Client({ accessToken: process.env.token });
  const ticketId = String(event.object.objectId);

  try {
    const dni = event.inputFields['dni_inquilino'];
    const expediente = event.inputFields['nro_expediente'];

    if (!dni || !expediente) {
      console.log('DNI o expediente vacio - sin accion');
      return callback({ outputFields: {} });
    }

    // Buscar todos los tickets con mismo DNI + expediente, ordenados por ID ASC
    const search = await client.crm.tickets.searchApi.doSearch({
      filterGroups: [{
        filters: [
          { propertyName: 'dni_inquilino', operator: 'EQ', value: dni },
          { propertyName: 'nro_expediente', operator: 'EQ', value: expediente },
          { propertyName: 'hs_pipeline', operator: 'EQ', value: '3353793749' }
        ]
      }],
      properties: ['hs_object_id'],
      sorts: [{ propertyName: 'hs_object_id', direction: 'ASCENDING' }],
      limit: 50
    });

    if (!search.results || search.results.length < 2) {
      console.log('Unico ticket con este DNI+expediente - es el original, sin accion');
      return callback({ outputFields: {} });
    }

    const ticketPadreId = search.results[0].id;

    // Si el ticket actual ES el mas antiguo, es el original - no hacer nada
    if (ticketId === ticketPadreId) {
      console.log('Este ticket es el original - sin accion');
      return callback({ outputFields: {} });
    }

    // Este ticket es retroactivo - setear propiedades
    await client.crm.tickets.basicApi.update(ticketId, {
      properties: {
        es_ticket_retroactivo: 'true',
        id_ticket_padre: ticketPadreId
      }
    });

    // Crear asociacion entre retroactivo y padre (typeId 452 HUBSPOT_DEFINED)
    await client.apiRequest({
      method: 'POST',
      path: '/crm/v4/associations/tickets/tickets/batch/create',
      body: {
        inputs: [{
          from: { id: ticketId },
          to: { id: ticketPadreId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 452 }]
        }]
      }
    });

    // Actualizar el ticket padre para indicar que tiene retroactivos
    await client.crm.tickets.basicApi.update(ticketPadreId, {
      properties: { tiene_tickets_retroactivos: 'true' }
    });

    console.log('Ticket ' + ticketId + ' marcado como retroactivo y asociado. Padre: ' + ticketPadreId + ' marcado con tiene_tickets_retroactivos');

  } catch (e) {
    console.error('Error:', e.message);
    throw e;
  }

  callback({ outputFields: {} });
};`;

const payload = {
  name: 'WF - Identificar Ticket Retroactivo (Incumplimientos)',
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
      fields: { delta: '1', time_unit: 'MINUTES' },
      type: 'SINGLE_CONNECTION'
    },
    {
      actionId: '2',
      secretNames: ['token'],
      sourceCode: codigo,
      runtime: 'NODE20X',
      inputFields: [
        { name: 'dni_inquilino', value: { propertyName: 'dni_inquilino', type: 'OBJECT_PROPERTY' } },
        { name: 'nro_expediente', value: { propertyName: 'nro_expediente', type: 'OBJECT_PROPERTY' } }
      ],
      outputFields: [],
      type: 'CUSTOM_CODE'
    }
  ],
  enrollmentCriteria: {
    shouldReEnroll: true,
    listFilterBranch: {
      filterBranches: [{
        filterBranches: [],
        filters: [
          { property: 'hs_pipeline', operation: { operator: 'IS_ANY_OF', includeObjectsWithNoValueSet: false, values: ['3353793749'], operationType: 'ENUMERATION' }, filterType: 'PROPERTY' },
          { property: 'nro_expediente', operation: { operator: 'IS_KNOWN', includeObjectsWithNoValueSet: false, operationType: 'ALL_PROPERTY' }, filterType: 'PROPERTY' },
          { property: 'dni_inquilino', operation: { operator: 'IS_KNOWN', includeObjectsWithNoValueSet: false, operationType: 'ALL_PROPERTY' }, filterType: 'PROPERTY' }
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
      filters: [
        { property: 'hs_name', operation: { operator: 'IS_EQUAL_TO', includeObjectsWithNoValueSet: false, value: 'nro_expediente', operationType: 'STRING' }, filterType: 'PROPERTY' },
        { property: 'hs_value', operation: { operator: 'IS_KNOWN', includeObjectsWithNoValueSet: false, operationType: 'ALL_PROPERTY' }, filterType: 'PROPERTY' }
      ],
      filterBranchType: 'AND',
      filterBranchOperator: 'AND'
    }],
    unEnrollObjectsNotMeetingCriteria: false,
    type: 'LIST_BASED'
  }
};

payload.revisionId = '2';

fetch('https://api.hubapi.com/automation/v4/flows/4315964629', {
  method: 'PUT',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(r => r.json()).then(d => {
  if (d.id) console.log('WF creado. ID:', d.id, '| Estado: Desactivado');
  else console.error('Error:', JSON.stringify(d, null, 2));
}).catch(console.error);
