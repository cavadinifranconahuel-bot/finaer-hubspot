// crear_wf_mora2_periodo.js
// Crea el WF "Mora 2 — Nutrir o Crear Deal Período" via Automation API v4
// node crear_wf_mora2_periodo.js

const fs   = require('fs');
const path = require('path');

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';

const sourceCode = fs.readFileSync(
  path.join(__dirname, 'wf_nutrir_o_crear_deal_periodo.js'),
  'utf8'
);

const payload = {
  name:          'Mora 2 — Nutrir o Crear Deal Período',
  objectTypeId:  '0-5',
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
      fields:     { delta: '2', time_unit: 'MINUTES' },
      type:       'SINGLE_CONNECTION'
    },
    {
      actionId:    '2',
      secretNames: ['token'],
      sourceCode,
      runtime:     'NODE20X',
      inputFields: [
        { name: 'nro_expediente',                  value: { propertyName: 'nro_expediente',                  type: 'OBJECT_PROPERTY' } },
        { name: 'periodo_de_deuda',                value: { propertyName: 'periodo_de_deuda',                type: 'OBJECT_PROPERTY' } },
        { name: 'nombre_y_apellido_del_inquilino', value: { propertyName: 'nombre_y_apellido_del_inquilino', type: 'OBJECT_PROPERTY' } },
        { name: 'deuda_alquiler',                  value: { propertyName: 'deuda_alquiler',                  type: 'OBJECT_PROPERTY' } },
        { name: 'deuda_expensas',                  value: { propertyName: 'deuda_expensas',                  type: 'OBJECT_PROPERTY' } },
        { name: 'deuda_luz',                       value: { propertyName: 'deuda_luz',                       type: 'OBJECT_PROPERTY' } },
        { name: 'deuda_gas',                       value: { propertyName: 'deuda_gas',                       type: 'OBJECT_PROPERTY' } },
        { name: 'deuda_abl',                       value: { propertyName: 'deuda_abl',                       type: 'OBJECT_PROPERTY' } },
        { name: 'deuda_aysa',                      value: { propertyName: 'deuda_aysa',                      type: 'OBJECT_PROPERTY' } },
        { name: 'deuda_por_entrega_de_llaves',     value: { propertyName: 'deuda_por_entrega_de_llaves',     type: 'OBJECT_PROPERTY' } }
      ],
      outputFields: [],
      type: 'CUSTOM_CODE'
    }
  ],
  enrollmentCriteria: {
    shouldReEnroll: false,
    type:           'LIST_BASED',
    listFilterBranch: {
      filterBranchType:     'OR',
      filterBranchOperator: 'OR',
      filters:              [],
      filterBranches: [{
        filterBranchType:     'AND',
        filterBranchOperator: 'AND',
        filterBranches:       [],
        filters: [
          { filterType: 'PROPERTY', property: 'hs_pipeline',        operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', values: ['3353793749'], includeObjectsWithNoValueSet: false } },
          { filterType: 'PROPERTY', property: 'hs_pipeline_stage',  operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', values: ['4594251972'], includeObjectsWithNoValueSet: false } },
          { filterType: 'PROPERTY', property: 'resultado_del_caso', operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', values: ['Resuelto con pago parcial FINAER', 'Resuelto con pago total FINAER'], includeObjectsWithNoValueSet: false } }
        ]
      }]
    },
    unEnrollObjectsNotMeetingCriteria: false
  }
};

async function main() {
  const fetch = (await import('node-fetch')).default;

  const res = await fetch('https://api.hubapi.com/automation/v4/flows', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('ERROR:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`WF creado — ID: ${data.id}`);
  console.log(`Nombre:    ${data.name}`);
  console.log(`Activo:    ${data.isEnabled}`);
}

main().catch(e => { console.error(e); process.exit(1); });
