// WF — Asociar Tickets Padre-Hijo por DNI + Expediente
// Trigger: nro_expediente cambia en un ticket del pipeline de Incumplimientos
// Lógica: busca tickets con mismo DNI + expediente, asocia como padre/hijo

require('dotenv').config({ path: '../.env' });
const TOKEN = process.env.HUBSPOT_TOKEN;
const BASE = 'https://api.hubapi.com';

// typeIds de asociación ticket→ticket
const TIPO_PADRE = 45; // desde el padre hacia el hijo: "Ticket padre"
const TIPO_HIJO = 46;  // desde el hijo hacia el padre: "Ticket hijo"

async function crearWF() {
  const payload = {
    name: 'WF — Asociar Ticket Padre/Hijo (Incumplimientos)',
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
        sourceCode: `
const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  const client = new hubspot.Client({ accessToken: process.env.token });
  const ticketId = String(event.object.objectId);

  try {
    const dni = event.inputFields['dni_inquilino'];
    const expediente = event.inputFields['nro_expediente'];

    if (!dni || !expediente) {
      console.log('DNI o expediente vacío — sin acción');
      return callback({ outputFields: {} });
    }

    console.log(\`Buscando tickets con DNI \${dni} y expediente \${expediente}\`);

    // Buscar todos los tickets con mismo DNI + expediente
    const search = await client.crm.tickets.searchApi.doSearch({
      filterGroups: [{
        filters: [
          { propertyName: 'dni_inquilino', operator: 'EQ', value: dni },
          { propertyName: 'nro_expediente', operator: 'EQ', value: expediente },
          { propertyName: 'hs_pipeline', operator: 'EQ', value: '3353793749' }
        ]
      }],
      properties: ['createdate', 'dni_inquilino', 'nro_expediente'],
      sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
      limit: 50
    });

    if (!search.results || search.results.length < 2) {
      console.log('Menos de 2 tickets con este DNI+expediente — sin acción');
      return callback({ outputFields: {} });
    }

    console.log(\`Encontrados \${search.results.length} tickets con DNI \${dni} + exp \${expediente}\`);

    // El primero (más antiguo) es el padre
    const padre = search.results[0];
    const hijos = search.results.slice(1);

    for (const hijo of hijos) {
      if (hijo.id === ticketId || padre.id === ticketId || hijo.id === padre.id) {
        // solo asociar si alguno de los dos es el ticket actual
      }

      // Verificar si ya están asociados
      const existentes = await client.apiRequest({
        method: 'POST',
        path: '/crm/v4/associations/tickets/tickets/batch/read',
        body: { inputs: [{ id: padre.id }] }
      });
      const yaAsociado = existentes.results?.[0]?.to?.some(t => t.toObjectId == hijo.id);
      if (yaAsociado) {
        console.log(\`Tickets \${padre.id} y \${hijo.id} ya asociados — omitido\`);
        continue;
      }

      // Crear asociación: padre → hijo (label "Ticket padre")
      await client.apiRequest({
        method: 'POST',
        path: '/crm/v4/associations/tickets/tickets/batch/create',
        body: {
          inputs: [{
            from: { id: padre.id },
            to: { id: hijo.id },
            types: [{ associationCategory: 'USER_DEFINED', associationTypeId: 45 }]
          }]
        }
      });

      // Crear asociación: hijo → padre (label "Ticket hijo")
      await client.apiRequest({
        method: 'POST',
        path: '/crm/v4/associations/tickets/tickets/batch/create',
        body: {
          inputs: [{
            from: { id: hijo.id },
            to: { id: padre.id },
            types: [{ associationCategory: 'USER_DEFINED', associationTypeId: 46 }]
          }]
        }
      });

      console.log(\`Asociado: Padre \${padre.id} ↔ Hijo \${hijo.id}\`);
    }

  } catch (e) {
    console.error('Error:', e.message);
    throw e;
  }

  callback({ outputFields: {} });
};`.trim(),
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
      eventFilterBranches: [{
        filterBranches: [],
        filters: [
          {
            property: 'hs_name',
            operation: { operator: 'IS_EQUAL_TO', includeObjectsWithNoValueSet: false, value: 'nro_expediente', operationType: 'STRING' },
            filterType: 'PROPERTY'
          },
          {
            property: 'hs_value',
            operation: { operator: 'IS_KNOWN', includeObjectsWithNoValueSet: false, operationType: 'ALL_PROPERTY' },
            filterType: 'PROPERTY'
          }
        ],
        eventTypeId: '4-1463224',
        operator: 'HAS_COMPLETED',
        filterBranchType: 'UNIFIED_EVENTS',
        filterBranchOperator: 'AND'
      }],
      listMembershipFilterBranches: [],
      type: 'EVENT_BASED'
    }
  };

  const res = await fetch('https://api.hubapi.com/automation/v4/flows', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const d = await res.json();
  if (d.id) {
    console.log('✅ WF creado. ID:', d.id, '| Estado: Desactivado');
  } else {
    console.error('❌ Error:', JSON.stringify(d, null, 2));
  }
}

crearWF().catch(console.error);
