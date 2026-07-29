const https = require('https');
const TOKEN = process.env.HUBSPOT_TOKEN;
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

// All 48 visita_* Deal properties
const ALL_VISITA_PROPS = [
  'visita_empresa_id','visita_empresa_nombre','visita_estado_cartera',
  'visita_resultado_gestion','visita_proxima_accion','visita_satisfaccion',
  'visita_nivel_interes','visita_vigencia_cliente','visita_potencial_comercial',
  'visita_fecha_proxima_presencial','visita_fecha_seguimiento',
  'visita_origen_contacto','visita_nueva_condiciones','visita_volumen_potencial',
  'visita_exclusividad','visita_presentacion_nueva','visita_continuidad',
  'visita_motivo_perdida','visita_motivos_inactividad','visita_motivo_falta_operacion',
  'visita_nueva_competencia','visita_condiciones_competencia','visita_conocimiento_servicio',
  'visita_datos_actualizados','visita_decision_inactiva','visita_tipo_observacion',
  'visita_proximo_paso_pasiva','visita_propuesta_reactivacion','visita_alertas_desvio',
  'visita_descripcion','visita_cant_propiedades','visita_competencia_actual',
  'visita_competidores_actuales','visita_condiciones_volver','visita_descripcion_accion',
  'visita_detalle_alerta','visita_detalle_final','visita_detalle_motivo',
  'visita_detalle_perdida','visita_detalle_propuesta','visita_detalle_proximo_paso',
  'visita_detalle_visita','visita_empresa_competidora','visita_fecha_otros_canales',
  'visita_fecha_presencial_perdida','visita_fecha_reactivacion',
  'visita_feedback_asesoria','visita_obs_satisfaccion'
];

async function run() {
  console.log('Fetching Workflow B...');
  const wf = await apiRequest('GET', `/automation/v4/flows/${WORKFLOW_B_ID}`);

  // Build the full properties array for Create Deal action
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
    ...ALL_VISITA_PROPS.map(prop => ({
      targetProperty: prop,
      value: { propertyName: prop, type: 'OBJECT_PROPERTY' }
    }))
  ];

  // Modify actions — update Create Deal action
  const newActions = wf.actions.map(a => {
    if (String(a.actionTypeId) === '0-14') {
      return {
        ...a,
        fields: {
          ...a.fields,
          properties: allProperties
        }
      };
    }
    return a;
  });

  // Build PUT payload
  const putBody = {
    name: wf.name,
    isEnabled: wf.isEnabled,
    revisionId: wf.revisionId,
    startActionId: wf.startActionId,
    nextAvailableActionId: wf.nextAvailableActionId,
    actions: newActions,
    enrollmentCriteria: wf.enrollmentCriteria,
    timeWindows: wf.timeWindows || [],
    blockedDates: wf.blockedDates || [],
    customProperties: wf.customProperties || {},
    dataSources: wf.dataSources || [],
    suppressionListIds: wf.suppressionListIds || [],
    canEnrollFromSalesforce: wf.canEnrollFromSalesforce || false,
    objectTypeId: wf.objectTypeId,
    type: wf.type    // CONTACT_FLOW
  };

  console.log(`Updating Workflow B with ${allProperties.length} properties in Create Deal...`);
  const result = await apiRequest('PUT', `/automation/v4/flows/${WORKFLOW_B_ID}`, putBody);

  if (result.id) {
    console.log(`\n✅ Workflow B actualizado — revisionId: ${result.revisionId}`);
    // Verify
    const verify = await apiRequest('GET', `/automation/v4/flows/${WORKFLOW_B_ID}`);
    const action = (verify.actions || []).find(a => String(a.actionTypeId) === '0-14');
    const count = action && action.fields && action.fields.properties ? action.fields.properties.length : '?';
    console.log(`   Propiedades en Create Deal (verificado): ${count}`);
    console.log(`   Editor: https://app-eu1.hubspot.com/automation/145725856/flow/${WORKFLOW_B_ID}/edit`);
  } else {
    console.log('ERROR:', JSON.stringify(result).slice(0, 600));

    // Try to identify which property is causing the issue - test with 20 first
    console.log('\nIntentando con primeras 20 propiedades...');
    const putBody20 = { ...putBody };
    putBody20.actions = wf.actions.map(a => {
      if (String(a.actionTypeId) === '0-14') {
        return { ...a, fields: { ...a.fields, properties: allProperties.slice(0, 20) } };
      }
      return a;
    });
    const r20 = await apiRequest('PUT', `/automation/v4/flows/${WORKFLOW_B_ID}`, putBody20);
    if (r20.id) {
      console.log('✅ 20 propiedades funcionó — hay un límite o propiedad inválida');
    } else {
      console.log('ERROR con 20 también:', JSON.stringify(r20).slice(0, 300));
    }
  }
}

run().catch(console.error);
