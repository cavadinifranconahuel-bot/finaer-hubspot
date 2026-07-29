// crear_wf_acumular_recursos_humand.js
// Crea el WF "Humand — Acumular Recursos" via Automation API v4
// node crear_wf_acumular_recursos_humand.js

const fs   = require('fs');
const path = require('path');

const TOKEN     = process.env.HUBSPOT_TOKEN;
const sourceCode = fs.readFileSync(
  path.join(__dirname, 'wf_acumular_recursos_humand.js'),
  'utf8'
);

const payload = {
  name:          'Humand — Acumular Recursos',
  objectTypeId:  '0-1',
  flowType:      'WORKFLOW',
  type:          'PLATFORM_FLOW',
  isEnabled:     false,
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
        { name: 'recursos_inscribir_humand',  value: { propertyName: 'recursos_inscribir_humand',  type: 'OBJECT_PROPERTY' } },
        { name: 'recursos_acumulados_humand', value: { propertyName: 'recursos_acumulados_humand', type: 'OBJECT_PROPERTY' } }
      ],
      outputFields: [{ name: 'resultado', type: 'STRING' }],
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
        filters: [{
          filterType: 'PROPERTY',
          property:   'recursos_inscribir_humand',
          operation:  { operationType: 'STRING', operator: 'IS_KNOWN', includeObjectsWithNoValueSet: false }
        }]
      }]
    },
    reEnrollmentTriggersFilterBranches: [{
      filterBranchType:     'AND',
      filterBranchOperator: 'AND',
      filterBranches:       [],
      filters: [{
        filterType: 'PROPERTY',
        property:   'recursos_inscribir_humand',
        operation:  { operationType: 'ALL_PROPERTY', operator: 'HAS_PROPERTY' }
      }]
    }],
    unEnrollObjectsNotMeetingCriteria: false
  }
};

async function main() {
  const fetch = (await import('node-fetch')).default;
  const headers = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  const res  = await fetch('https://api.hubapi.com/automation/v4/flows', {
    method: 'POST', headers, body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (!res.ok) {
    console.error('ERROR:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`WF creado — ID: ${data.id}`);
  console.log(`Nombre:  ${data.name}`);
  console.log(`Activo:  ${data.isEnabled}`);
}

main().catch(e => { console.error(e); process.exit(1); });
