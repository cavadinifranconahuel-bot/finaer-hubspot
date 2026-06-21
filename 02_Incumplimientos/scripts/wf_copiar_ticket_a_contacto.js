const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();

const codigo = `const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  const client = new hubspot.Client({ accessToken: process.env.token });
  const ticketId = String(event.object.objectId);

  try {
    // Leer todas las propiedades del ticket
    const ticket = await client.crm.tickets.basicApi.getById(ticketId, [
      'correo_del_propietario',
      'dni_inquilino',
      'fecha_desde_que_adeuda',
      'tipo_de_incumplimiento',
      'deuda_alquiler',
      'deuda_expensas',
      'deuda_luz',
      'deuda_gas',
      'deuda_abl',
      'deuda_aysa',
      'alias_cbu_impagos',
      'monto_total_de_la_deuda_acumulada',
      'nombre_y_apellido_del_inquilino',
      'nombre_y_apellido_del_propietario',
      'cuit_cuil',
      'numero_de_cuenta'
    ]);

    const correo = ticket.properties.correo_del_propietario;

    if (!correo) {
      console.log('Sin correo_del_propietario — sin accion');
      return callback({ outputFields: {} });
    }

    // Buscar el Contact por email
    const search = await client.crm.contacts.searchApi.doSearch({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: correo }] }],
      properties: ['email'],
      limit: 1
    });

    if (!search.results || search.results.length === 0) {
      console.log('Contact no encontrado para: ' + correo);
      return callback({ outputFields: {} });
    }

    const contactId = search.results[0].id;

    // Construir propiedades a copiar (solo las que tienen valor)
    const props = {};
    const campos = [
      'dni_inquilino', 'fecha_desde_que_adeuda', 'tipo_de_incumplimiento',
      'deuda_alquiler', 'deuda_expensas', 'deuda_luz', 'deuda_gas',
      'deuda_abl', 'deuda_aysa', 'alias_cbu_impagos',
      'monto_total_de_la_deuda_acumulada', 'nombre_y_apellido_del_inquilino',
      'nombre_y_apellido_del_propietario', 'cuit_cuil', 'numero_de_cuenta'
    ];

    for (const campo of campos) {
      if (ticket.properties[campo]) {
        props[campo] = ticket.properties[campo];
      }
    }

    // Actualizar el Contact
    await client.crm.contacts.basicApi.update(contactId, { properties: props });

    console.log('Contact ' + contactId + ' actualizado con ' + Object.keys(props).length + ' propiedades del ticket');

  } catch (e) {
    console.error('Error:', e.message);
    throw e;
  }

  callback({ outputFields: {} });
};`;

const payload = {
  name: 'WF — Copiar datos Ticket al Contact (Incumplimientos)',
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
      fields: { delta: '10', time_unit: 'MINUTES' },
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
        filters: [{
          property: 'hs_pipeline',
          operation: { operator: 'IS_ANY_OF', includeObjectsWithNoValueSet: false, values: ['3353793749'], operationType: 'ENUMERATION' },
          filterType: 'PROPERTY'
        }],
        filterBranchType: 'AND',
        filterBranchOperator: 'AND'
      }],
      filters: [],
      filterBranchType: 'OR',
      filterBranchOperator: 'OR'
    },
    unEnrollObjectsNotMeetingCriteria: false,
    reEnrollmentTriggersFilterBranches: [],
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
