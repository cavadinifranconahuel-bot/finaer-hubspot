const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();

const codigo = `const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  const client = new hubspot.Client({ accessToken: process.env.token });
  const ticketId = String(event.object.objectId);

  try {
    const dni = event.inputFields['dni_inquilino'];

    // Obtener contactos del ticket
    const asocs = await client.apiRequest({
      method: 'GET',
      path: '/crm/v4/objects/tickets/' + ticketId + '/associations/contacts'
    });

    const contactIds = [...new Set((asocs.results || []).map(a => String(a.toObjectId)))];

    if (!contactIds.length) {
      console.log('Sin contactos en el ticket - sin accion');
      return callback({ outputFields: {} });
    }

    // Leer datos de los contactos
    const contactsData = await client.crm.contacts.batchApi.read({
      inputs: contactIds.map(id => ({ id })),
      properties: ['email', 'nro_documento_txt']
    });

    // Excluir el inquilino por DNI, tomar el primer email del resto
    const dniNormalizado = dni ? String(parseInt(dni)) : '';
    const emailPropietario = (contactsData.results || [])
      .filter(c => c.properties.nro_documento_txt !== dniNormalizado && c.properties.email)
      .map(c => c.properties.email)[0];

    if (!emailPropietario) {
      console.log('No se encontro email del propietario - sin accion');
      return callback({ outputFields: {} });
    }

    // Actualizar correo_del_propietario en el ticket
    await client.crm.tickets.basicApi.update(ticketId, {
      properties: { correo_del_propietario: emailPropietario }
    });

    console.log('Correo propietario actualizado: ' + emailPropietario);

  } catch (e) {
    console.error('Error:', e.message);
    throw e;
  }

  callback({ outputFields: {} });
};`;

const payload = {
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

fetch('https://api.hubapi.com/automation/v4/flows', {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(r => r.json()).then(d => {
  if (d.id) console.log('WF creado. ID:', d.id, '| Estado: Desactivado');
  else console.error('Error:', JSON.stringify(d, null, 2));
}).catch(console.error);
