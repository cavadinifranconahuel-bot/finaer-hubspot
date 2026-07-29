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

// All 47 visita_* Contact properties to copy into the Deal
// (visita_empresa_id is already there as OBJECT_PROPERTY)
// These are all the properties from Contact that need to land on Deal
const ALL_VISITA_PROPS = [
  'visita_empresa_id',
  'visita_empresa_nombre',
  'visita_estado_cartera',
  'visita_resultado_gestion',
  'visita_proxima_accion',
  'visita_satisfaccion',
  'visita_nivel_interes',
  'visita_vigencia_cliente',
  'visita_potencial_comercial',
  'visita_fecha_proxima_presencial',
  'visita_fecha_seguimiento',
  'visita_origen_contacto',
  'visita_nueva_condiciones',
  'visita_volumen_potencial',
  'visita_exclusividad',
  'visita_presentacion_nueva',
  'visita_continuidad',
  'visita_motivo_perdida',
  'visita_motivos_inactividad',
  'visita_motivo_falta_operacion',
  'visita_nueva_competencia',
  'visita_condiciones_competencia',
  'visita_conocimiento_servicio',
  'visita_datos_actualizados',
  'visita_decision_inactiva',
  'visita_tipo_observacion',
  'visita_proximo_paso_pasiva',
  'visita_propuesta_reactivacion',
  'visita_alertas_desvio',
  'visita_descripcion',
  'visita_cant_propiedades',
  'visita_competencia_actual',
  'visita_competidores_actuales',
  'visita_condiciones_volver',
  'visita_descripcion_accion',
  'visita_detalle_alerta',
  'visita_detalle_final',
  'visita_detalle_motivo',
  'visita_detalle_perdida',
  'visita_detalle_propuesta',
  'visita_detalle_proximo_paso',
  'visita_detalle_visita',
  'visita_empresa_competidora',
  'visita_fecha_otros_canales',
  'visita_fecha_presencial_perdida',
  'visita_fecha_reactivacion',
  'visita_feedback_asesoria',
  'visita_obs_satisfaccion'
];

async function run() {
  // Fetch current workflow
  console.log('Fetching Workflow B...');
  const wf = await apiRequest('GET', `/automation/v4/flows/${WORKFLOW_B_ID}`);

  // Find and update the Create Deal action (0-14)
  function updateCreateDeal(actions) {
    for (const a of actions) {
      if (String(a.actionTypeId) === '0-14') {
        // Keep dealname and dealstage as-is, replace everything else with full visita_* list
        const fixed = [
          {
            targetProperty: 'dealname',
            value: {
              staticValue: 'Visita - {{ enrolled_object.visita_empresa_nombre }} ({{ enrolled_object.visita_estado_cartera }})',
              type: 'STATIC_VALUE'
            }
          },
          {
            targetProperty: 'dealstage',
            value: {
              staticValue: '4921967837',
              type: 'STATIC_VALUE'
            }
          },
          // All visita_* as OBJECT_PROPERTY (copy from enrolled Contact)
          ...ALL_VISITA_PROPS.map(prop => ({
            targetProperty: prop,
            value: {
              propertyName: prop,
              type: 'OBJECT_PROPERTY'
            }
          }))
        ];
        a.fields.properties = fixed;
        console.log(`  ✅ Create Deal action actualizada con ${fixed.length} propiedades (2 fijas + ${ALL_VISITA_PROPS.length} visita_*)`);
        return true;
      }
      if (a.actions && a.actions.length) {
        if (updateCreateDeal(a.actions)) return true;
      }
    }
    return false;
  }

  const found = updateCreateDeal(wf.actions || []);
  if (!found) {
    console.log('ERROR: No se encontró la acción 0-14 en Workflow B');
    return;
  }

  // PUT back
  console.log('Actualizando Workflow B...');
  const result = await apiRequest('PUT', `/automation/v4/flows/${WORKFLOW_B_ID}`, wf);

  if (result.id) {
    // Verify the update
    const verify = await apiRequest('GET', `/automation/v4/flows/${WORKFLOW_B_ID}`);
    let count = 0;
    function countProps(actions) {
      for (const a of actions) {
        if (String(a.actionTypeId) === '0-14') {
          count = (a.fields && a.fields.properties) ? a.fields.properties.length : 0;
          return;
        }
        if (a.actions && a.actions.length) countProps(a.actions);
      }
    }
    countProps(verify.actions || []);

    console.log(`\n✅ Workflow B actualizado`);
    console.log(`   Propiedades en Create Deal: ${count}`);
    console.log(`   Editor: https://app-eu1.hubspot.com/automation/145725856/flow/${WORKFLOW_B_ID}/edit`);
  } else {
    console.log('ERROR:', JSON.stringify(result).slice(0, 500));
  }
}

run().catch(console.error);
