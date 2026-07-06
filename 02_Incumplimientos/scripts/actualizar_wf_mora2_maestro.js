// actualizar_wf_mora2_maestro.js
// Actualiza WF 4465889492 "Mora 2 — Actualizar Deal Maestro" via Automation API v4
// node actualizar_wf_mora2_maestro.js

const fs   = require('fs');
const path = require('path');

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const WF_ID = '4465889492';

const sourceCode = fs.readFileSync(
  path.join(__dirname, 'wf_actualizar_deal_maestro.js'),
  'utf8'
);

const payload = {
  name:          'Mora 2 — Actualizar Deal Maestro',
  objectTypeId:  '0-3',
  flowType:      'WORKFLOW',
  type:          'PLATFORM_FLOW',
  isEnabled:     false,
  revisionId:    '',   // se completa automáticamente al ejecutar
  startActionId: '1',
  actions: [
    {
      actionId:          '1',
      actionTypeId:      '0-1',
      actionTypeVersion: 0,
      connection: { edgeType: 'STANDARD', nextActionId: '2' },
      fields:     { delta: '1', time_unit: 'MINUTES' },
      type:       'SINGLE_CONNECTION'
    },
    {
      actionId:    '2',
      secretNames: ['token'],
      sourceCode,
      runtime:     'NODE20X',
      inputFields: [
        { name: 'nro_expediente',                  value: { propertyName: 'nro_expediente',                  type: 'OBJECT_PROPERTY' } },
        { name: 'nombre_y_apellido_del_inquilino', value: { propertyName: 'nombre_y_apellido_del_inquilino', type: 'OBJECT_PROPERTY' } },
        { name: 'dni_inquilino',                   value: { propertyName: 'dni_inquilino',                   type: 'OBJECT_PROPERTY' } }
      ],
      outputFields: [
        { name: 'resultado', type: 'STRING' }
      ],
      type: 'CUSTOM_CODE'
    }
  ],
  enrollmentCriteria: {
    shouldReEnroll: true,
    type: 'LIST_BASED',
    listFilterBranch: {
      filterBranchType:     'OR',
      filterBranchOperator: 'OR',
      filters:              [],
      filterBranches: [{
        filterBranchType:     'AND',
        filterBranchOperator: 'AND',
        filterBranches:       [],
        filters: [
          {
            filterType: 'PROPERTY',
            property:   'pipeline',
            operation:  { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', values: ['3403406575'], includeObjectsWithNoValueSet: false }
          }
        ]
      }]
    },
    reEnrollmentTriggersFilterBranches: [
      {
        filterBranchType:     'AND',
        filterBranchOperator: 'AND',
        filterBranches:       [],
        filters: [
          {
            filterType: 'PROPERTY',
            property:   'hs_name',
            operation:  { operationType: 'STRING', operator: 'IS_EQUAL_TO', value: 'alquiler', includeObjectsWithNoValueSet: false }
          },
          {
            filterType: 'PROPERTY',
            property:   'hs_value',
            operation:  { operationType: 'STRING', operator: 'IS_KNOWN', includeObjectsWithNoValueSet: false }
          }
        ]
      }
    ],
    unEnrollObjectsNotMeetingCriteria: false
  }
};

async function main() {
  const fetch = (await import('node-fetch')).default;
  const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

  // Leer WF actual completo — preservar enrollmentCriteria configurado en UI
  const current = await fetch(`https://api.hubapi.com/automation/v4/flows/${WF_ID}`, { headers: authHeader });
  const currentData = await current.json();
  console.log(`revisionId actual: ${currentData.revisionId} | activo: ${currentData.isEnabled}`);

  // Solo reemplazar actions y sourceCode; preservar todo lo demás
  const merged = {
    ...currentData,
    revisionId: String(currentData.revisionId),
    actions:    payload.actions
  };

  const res = await fetch(`https://api.hubapi.com/automation/v4/flows/${WF_ID}`, {
    method:  'PUT',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body:    JSON.stringify(merged)
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('ERROR:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`WF actualizado — ID: ${data.id}`);
  console.log(`Nombre:  ${data.name}`);
  console.log(`Activo:  ${data.isEnabled}`);
}

main().catch(e => { console.error(e); process.exit(1); });
