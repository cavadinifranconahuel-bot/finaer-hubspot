const https = require('https');
const TOKEN = 'pat-eu1-87f3fc69-9f28-409b-9046-db09ef4e6d31';
const WORKFLOW_B_ID = '4092196041';

function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json; charset=utf-8' };
    if (data) headers['Content-Length'] = data.length;
    const req = https.request({ hostname: 'api.hubapi.com', path: apiPath, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => {
        const text = Buffer.concat(c).toString('utf8');
        try { resolve(text ? JSON.parse(text) : {}); } catch(e) { resolve({ _raw: text }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Step 1: Fix all Nahuel-created Deal properties that have mismatched options vs Contact ──

async function syncOptionsFromContact(propName) {
  const contact = await apiRequest('GET', `/crm/v3/properties/contacts/${propName}`);
  const deal = await apiRequest('GET', `/crm/v3/properties/0-3/${propName}`);

  if (!contact.name) { console.log(`  ⚠️  ${propName} no existe en Contact`); return false; }
  if (!deal.name) { console.log(`  ⚠️  ${propName} no existe en Deal`); return false; }

  // Compare option values
  const cOpts = (contact.options || []).map(o => o.value).sort().join(',');
  const dOpts = (deal.options || []).map(o => o.value).sort().join(',');

  if (cOpts === dOpts) {
    console.log(`  ✓  ${propName} opciones coinciden`);
    return true;
  }

  console.log(`  🔧 ${propName} — Contact options: [${cOpts}] ≠ Deal options: [${dOpts}] → fixing`);

  // Patch Deal property to match Contact options exactly
  const patch = await apiRequest('PATCH', `/crm/v3/properties/0-3/${propName}`, {
    options: contact.options.map(o => ({
      label: o.label,
      value: o.value,
      displayOrder: o.displayOrder,
      hidden: false
    }))
  });

  if (patch.name) {
    console.log(`  ✅ ${propName} corregida`);
    return true;
  } else {
    console.log(`  ❌ Error al corregir ${propName}:`, JSON.stringify(patch).slice(0, 200));
    return false;
  }
}

// All 47 Contact visita_* properties (excluding visita_descripcion which doesn't exist on Contact)
const CONTACT_VISITA_PROPS = [
  'visita_alertas_desvio', 'visita_cant_propiedades', 'visita_competencia_actual',
  'visita_competidores_actuales', 'visita_condiciones_competencia', 'visita_condiciones_volver',
  'visita_conocimiento_servicio', 'visita_continuidad', 'visita_datos_actualizados',
  'visita_decision_inactiva', 'visita_descripcion_accion', 'visita_detalle_alerta',
  'visita_detalle_final', 'visita_detalle_motivo', 'visita_detalle_perdida',
  'visita_detalle_propuesta', 'visita_detalle_proximo_paso', 'visita_detalle_visita',
  'visita_empresa_competidora', 'visita_empresa_id', 'visita_empresa_nombre',
  'visita_estado_cartera', 'visita_exclusividad', 'visita_fecha_otros_canales',
  'visita_fecha_presencial_perdida', 'visita_fecha_proxima_presencial', 'visita_fecha_reactivacion',
  'visita_fecha_seguimiento', 'visita_feedback_asesoria', 'visita_motivo_falta_operacion',
  'visita_motivo_perdida', 'visita_motivos_inactividad', 'visita_nivel_interes',
  'visita_nueva_competencia', 'visita_nueva_condiciones', 'visita_obs_satisfaccion',
  'visita_origen_contacto', 'visita_potencial_comercial', 'visita_presentacion_nueva',
  'visita_propuesta_reactivacion', 'visita_proxima_accion', 'visita_proximo_paso_pasiva',
  'visita_resultado_gestion', 'visita_satisfaccion', 'visita_tipo_observacion',
  'visita_vigencia_cliente', 'visita_volumen_potencial'
];

async function run() {
  // ── 1. Sync options for all enumeration properties ─────────────────────────
  console.log('=== Paso 1: Sincronizar opciones Contact → Deal ===');
  for (const prop of CONTACT_VISITA_PROPS) {
    await syncOptionsFromContact(prop);
  }

  // ── 2. Build the full property list for Workflow B ─────────────────────────
  console.log('\n=== Paso 2: Actualizar Workflow B ===');
  const wf = await apiRequest('GET', `/automation/v4/flows/${WORKFLOW_B_ID}`);
  console.log(`Workflow B — revisionId: ${wf.revisionId}, isEnabled: ${wf.isEnabled}`);

  const allProperties = [
    {
      targetProperty: 'dealname',
      value: {
        staticValue: 'Visita - {{ enrolled_object.visita_empresa_nombre }} ({{ enrolled_object.visita_estado_cartera }})',
        type: 'STATIC_VALUE'
      }
    },
    {
      targetProperty: 'dealstage',
      value: { staticValue: '4921967837', type: 'STATIC_VALUE' }
    },
    // All 47 visita_* Contact properties copied to Deal
    ...CONTACT_VISITA_PROPS.map(prop => ({
      targetProperty: prop,
      value: { propertyName: prop, type: 'OBJECT_PROPERTY' }
    }))
  ];

  const wfCopy = JSON.parse(JSON.stringify(wf));
  const createAction = wfCopy.actions.find(a => String(a.actionTypeId) === '0-14');
  createAction.fields.properties = allProperties;

  console.log(`Enviando ${allProperties.length} propiedades (2 fijas + 47 visita_*)...`);
  const result = await apiRequest('PUT', `/automation/v4/flows/${WORKFLOW_B_ID}`, wfCopy);

  if (result.id) {
    // Verify
    const verify = await apiRequest('GET', `/automation/v4/flows/${WORKFLOW_B_ID}`);
    const ca = verify.actions.find(a => String(a.actionTypeId) === '0-14');
    const count = ca && ca.fields && ca.fields.properties ? ca.fields.properties.length : '?';
    console.log(`\n✅ Workflow B actualizado — revisionId: ${result.revisionId}`);
    console.log(`   Propiedades en Create Deal: ${count}`);
    console.log(`   URL: https://app-eu1.hubspot.com/automation/145725856/flow/${WORKFLOW_B_ID}/edit`);
  } else {
    console.log('\n❌ Error en Workflow B:', JSON.stringify(result).slice(0, 500));

    // Binary search to find which property is still causing issues
    console.log('\nBuscando propiedad problemática con bisección...');
    await binarySearch(wf, CONTACT_VISITA_PROPS);
  }
}

async function binarySearch(wf, props) {
  if (props.length <= 1) {
    console.log('Propiedad problemática:', props[0] || 'ninguna encontrada');
    return;
  }
  const half = Math.floor(props.length / 2);
  const first = props.slice(0, half);
  const second = props.slice(half);

  // Test first half
  const wf1 = JSON.parse(JSON.stringify(wf));
  const ca1 = wf1.actions.find(a => String(a.actionTypeId) === '0-14');
  const base = [
    { targetProperty: 'dealname', value: { staticValue: 'test', type: 'STATIC_VALUE' } },
    { targetProperty: 'dealstage', value: { staticValue: '4921967837', type: 'STATIC_VALUE' } }
  ];
  ca1.fields.properties = [...base, ...first.map(p => ({ targetProperty: p, value: { propertyName: p, type: 'OBJECT_PROPERTY' } }))];
  const r1 = await apiRequest('PUT', `/automation/v4/flows/${WORKFLOW_B_ID}`, wf1);
  if (!r1.id) {
    console.log(`  ❌ Primera mitad falla [${first[0]}..${first[first.length-1]}]`);
    const wf2 = await apiRequest('GET', `/automation/v4/flows/${WORKFLOW_B_ID}`);
    return binarySearch(wf2, first);
  } else {
    console.log(`  ✅ Primera mitad OK [${first[0]}..${first[first.length-1]}]`);
    const wf2 = await apiRequest('GET', `/automation/v4/flows/${WORKFLOW_B_ID}`);
    console.log(`  ❌ Segunda mitad debe fallar [${second[0]}..${second[second.length-1]}]`);
    return binarySearch(wf2, second);
  }
}

run().catch(console.error);
