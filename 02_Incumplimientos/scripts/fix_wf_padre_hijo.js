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

    // Buscar por DNI + expediente, ordenar por hs_object_id ASC
    // hs_object_id es incremental — el ID mas bajo = el ticket creado primero
    // Esto evita el bug de timing donde createdate puede estar desincronizado
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
      console.log('Menos de 2 tickets con este DNI+expediente - sin accion');
      return callback({ outputFields: {} });
    }

    const padre = search.results[0];
    const hijos = search.results.slice(1);
    console.log('Padre:', padre.id, '| Hijos:', hijos.map(h => h.id).join(', '));

    for (const hijo of hijos) {
      const existentes = await client.apiRequest({
        method: 'POST',
        path: '/crm/v4/associations/tickets/tickets/batch/read',
        body: { inputs: [{ id: padre.id }] }
      });
      const yaAsociado = existentes.results?.[0]?.to?.some(t => t.toObjectId == hijo.id);
      if (yaAsociado) { console.log('Ya asociados:', padre.id, hijo.id); continue; }

      await client.apiRequest({
        method: 'POST',
        path: '/crm/v4/associations/tickets/tickets/batch/create',
        body: { inputs: [{ from: { id: padre.id }, to: { id: hijo.id }, types: [{ associationCategory: 'USER_DEFINED', associationTypeId: 45 }] }] }
      });
      await client.apiRequest({
        method: 'POST',
        path: '/crm/v4/associations/tickets/tickets/batch/create',
        body: { inputs: [{ from: { id: hijo.id }, to: { id: padre.id }, types: [{ associationCategory: 'USER_DEFINED', associationTypeId: 46 }] }] }
      });
      console.log('Asociado Padre', padre.id, '<-> Hijo', hijo.id);
    }
  } catch (e) { console.error('Error:', e.message); throw e; }
  callback({ outputFields: {} });
};`;

const payload = {
  revisionId: '4',
  name: 'WF - Asociar Ticket Padre/Hijo (Incumplimientos)',
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
          { property: 'nro_expediente', operation: { operator: 'IS_KNOWN', includeObjectsWithNoValueSet: false, operationType: 'ALL_PROPERTY' }, filterType: 'PROPERTY' }
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

fetch(`https://api.hubapi.com/automation/v4/flows/4315625700`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(r => r.json()).then(d => {
  if (d.id) console.log('WF actualizado. ID:', d.id, '| Trigger: LIST_BASED con re-enrollment por nro_expediente');
  else console.error('Error:', JSON.stringify(d, null, 2));
}).catch(console.error);
