// WF — Reasignación por DNI Inquilino (Incumplimientos)
// Trigger: dni_inquilino se completa en un ticket del pipeline de Incumplimientos
// Lógica: si existe ticket previo con mismo DNI, asigna el mismo propietario

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const BASE = 'https://api.hubapi.com';

async function crearWF() {
  const payload = {
    name: 'WF — Reasignación por DNI Inquilino (Incumplimientos)',
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
        sourceCode: `
const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  const client = new hubspot.Client({ accessToken: process.env.token });
  const ticketId = String(event.object.objectId);

  try {
    const dni = event.inputFields['dni_inquilino'];

    if (!dni) {
      console.log('DNI vacío — sin acción');
      return callback({ outputFields: {} });
    }

    console.log(\`Buscando tickets previos con DNI \${dni}\`);

    const search = await client.crm.tickets.searchApi.doSearch({
      filterGroups: [{
        filters: [
          { propertyName: 'dni_inquilino', operator: 'EQ', value: dni },
          { propertyName: 'hs_pipeline', operator: 'EQ', value: '3353793749' },
          { propertyName: 'hs_object_id', operator: 'NEQ', value: ticketId }
        ]
      }],
      properties: ['hubspot_owner_id', 'createdate'],
      sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
      limit: 1
    });

    if (!search.results || search.results.length === 0) {
      console.log('No hay tickets previos con este DNI — se mantiene asignación rotativa');
      return callback({ outputFields: {} });
    }

    const ticketPrevio = search.results[0];
    const propietario = ticketPrevio.properties?.hubspot_owner_id;

    if (!propietario) {
      console.log('Ticket previo encontrado pero sin propietario — sin acción');
      return callback({ outputFields: {} });
    }

    console.log(\`Ticket previo: \${ticketPrevio.id} | Propietario: \${propietario}\`);

    await client.crm.tickets.basicApi.update(ticketId, {
      properties: { hubspot_owner_id: propietario }
    });

    console.log(\`Ticket \${ticketId} reasignado a propietario \${propietario}\`);

  } catch (e) {
    console.error('Error:', e.message);
    throw e;
  }

  callback({ outputFields: {} });
};`.trim(),
        runtime: 'NODE20X',
        inputFields: [
          { name: 'dni_inquilino', value: { propertyName: 'dni_inquilino', type: 'OBJECT_PROPERTY' } }
        ],
        outputFields: [],
        type: 'CUSTOM_CODE'
      }
    ],
    enrollmentCriteria: {
      shouldReEnroll: false,
      eventFilterBranches: [{
        filterBranches: [],
        filters: [
          {
            property: 'hs_name',
            operation: { operator: 'IS_EQUAL_TO', includeObjectsWithNoValueSet: false, value: 'dni_inquilino', operationType: 'STRING' },
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

  const res = await fetch(`${BASE}/automation/v4/flows`, {
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
