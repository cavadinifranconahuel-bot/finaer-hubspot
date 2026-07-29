// actualizar_wf_mora2_periodo.js
// Actualiza WF 4465972431 "Mora 2 — Nutrir o Crear Deal Período" via Automation API v4
// node actualizar_wf_mora2_periodo.js

const fs   = require('fs');
const path = require('path');

const TOKEN = process.env.HUBSPOT_TOKEN;
const WF_ID = '4465972431';

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
  revisionId:    '',   // se completa automáticamente al ejecutar
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
        { name: 'deuda_por_entrega_de_llaves',     value: { propertyName: 'deuda_por_entrega_de_llaves',     type: 'OBJECT_PROPERTY' } },
        { name: 'dni_inquilino',                   value: { propertyName: 'dni_inquilino',                   type: 'OBJECT_PROPERTY' } },
        { name: 'tipo_de_incumplimiento',          value: { propertyName: 'tipo_de_incumplimiento',          type: 'OBJECT_PROPERTY' } }
      ],
      outputFields: [
        { name: 'resultado', type: 'STRING' }
      ],
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
  const headers = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  // Obtener revisionId actual antes de hacer el PUT
  const current = await fetch(`https://api.hubapi.com/automation/v4/flows/${WF_ID}`, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  const currentData = await current.json();
  payload.revisionId = String(currentData.revisionId);
  payload.isEnabled  = currentData.isEnabled;
  console.log(`revisionId actual: ${payload.revisionId} | activo: ${payload.isEnabled}`);

  const res = await fetch(`https://api.hubapi.com/automation/v4/flows/${WF_ID}`, {
    method:  'PUT',
    headers,
    body: JSON.stringify(payload)
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
