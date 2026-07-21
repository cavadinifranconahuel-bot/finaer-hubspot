// WF — Reasignación por DNI Inquilino (Deals — Seguimiento de Deuda)
// Lógica idéntica al WF de Tickets pero sobre el pipeline de Deals (3403406575)
// Trigger: dni_inquilino se conoce en un Deal del pipeline
// Si existe un Deal previo con el mismo DNI → reasigna al mismo propietario

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const BASE  = 'https://api.hubapi.com';

async function crearWF() {
  const payload = {
    name: 'WF — Reasignación por DNI Inquilino (Seguimiento de Deuda)',
    objectTypeId: '0-3',
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
  const dealId = String(event.object.objectId);

  try {
    const dni = event.inputFields['dni_inquilino'];

    if (!dni) {
      console.log('DNI vacío — sin acción');
      return callback({ outputFields: {} });
    }

    console.log(\`Buscando deals previos con DNI \${dni}\`);

    const search = await client.crm.deals.searchApi.doSearch({
      filterGroups: [{
        filters: [
          { propertyName: 'dni_inquilino', operator: 'EQ',  value: dni },
          { propertyName: 'pipeline',      operator: 'EQ',  value: '3403406575' },
          { propertyName: 'hs_object_id',  operator: 'NEQ', value: dealId }
        ]
      }],
      properties: ['hubspot_owner_id', 'createdate'],
      sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
      limit: 1
    });

    if (!search.results || search.results.length === 0) {
      console.log('No hay deals previos con este DNI — se mantiene asignación rotativa');
      return callback({ outputFields: {} });
    }

    const dealPrevio   = search.results[0];
    const propietario  = dealPrevio.properties?.hubspot_owner_id;

    if (!propietario) {
      console.log('Deal previo encontrado pero sin propietario — sin acción');
      return callback({ outputFields: {} });
    }

    console.log(\`Deal previo: \${dealPrevio.id} | Propietario: \${propietario}\`);

    await client.crm.deals.basicApi.update(dealId, {
      properties: { hubspot_owner_id: propietario }
    });

    console.log(\`Deal \${dealId} reasignado a propietario \${propietario}\`);

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
      listFilterBranch: {
        filterBranches: [{
          filterBranches: [],
          filters: [
            {
              property: 'pipeline',
              operation: { operator: 'IS_ANY_OF', includeObjectsWithNoValueSet: false, values: ['3403406575'], operationType: 'ENUMERATION' },
              filterType: 'PROPERTY'
            },
            {
              property: 'dni_inquilino',
              operation: { operator: 'IS_KNOWN', includeObjectsWithNoValueSet: false, operationType: 'ALL_PROPERTY' },
              filterType: 'PROPERTY'
            }
          ],
          filterBranchType: 'AND',
          filterBranchOperator: 'AND'
        }],
        filters: [],
        filterBranchType: 'OR',
        filterBranchOperator: 'OR'
      },
      type: 'LIST_BASED'
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
    console.log('Nombre:', d.name);
  } else {
    console.error('❌ Error:', JSON.stringify(d, null, 2));
  }
}

crearWF().catch(console.error);
