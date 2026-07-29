/**
 * Crea el WF de cálculo de punitorios en HubSpot
 * Pipeline: Seguimiento de Deuda (3403406575)
 * Trigger: fecha_desembolso conocida + tasa_punitorio = 0_5_diario
 *
 * Lógica:
 * - Alquiler:   deuda × 0.5% × max(0, días_desde_desembolso - plazo)
 * - Servicios:  (expensas + gas + luz + abl) × 0.1% × días_desde_desembolso
 * - Total:      punitorio_alquiler + punitorio_servicios
 *
 * Resultados escritos en Deal Y en Ticket asociado.
 */

const https = require('https');
const TOKEN = process.env.HUBSPOT_TOKEN;

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = data.length;
    const req = https.request({ hostname: 'api.hubapi.com', path, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => {
        const text = Buffer.concat(c).toString('utf8');
        try { resolve(JSON.parse(text)); } catch(e) { resolve({ _raw: text }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Código del custom code action ─────────────────────────────────────────────
const CUSTOM_CODE = `
exports.main = async (event, callback) => {
  const hubspotClient = event.hubspotClient;
  const dealId = event.object.objectId;
  const props  = event.object.properties;

  // Fecha de desembolso (HubSpot envía fecha como timestamp en ms o YYYY-MM-DD)
  const raw = props.fecha_desembolso;
  const fechaDesembolso = isNaN(raw) ? new Date(raw) : new Date(parseInt(raw));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  fechaDesembolso.setHours(0, 0, 0, 0);
  const daysDiff = Math.max(0, Math.floor((today - fechaDesembolso) / 86400000));

  // Inputs del Deal
  const plazo    = parseInt(props.plazo_punitorio) || 10;
  const alquiler = parseFloat(props.alquiler)  || 0;
  const expensas = parseFloat(props.expensas)  || 0;
  const gas      = parseFloat(props.gas)       || 0;
  const luz      = parseFloat(props.luz)       || 0;
  const abl      = parseFloat(props.abl)       || 0;

  // Cálculos
  const diasAlquiler      = Math.max(0, daysDiff - plazo);
  const punitorioAlquiler = Math.round(alquiler * 0.005 * diasAlquiler * 100) / 100;
  const punitorioServicios = Math.round((expensas + gas + luz + abl) * 0.001 * daysDiff * 100) / 100;
  const totalPunitorios   = Math.round((punitorioAlquiler + punitorioServicios) * 100) / 100;

  // Actualizar Deal
  await hubspotClient.crm.deals.basicApi.update(dealId, {
    properties: {
      punitorio_alquiler:  punitorioAlquiler.toString(),
      punitorio_servicios: punitorioServicios.toString(),
      total_punitorios:    totalPunitorios.toString()
    }
  });

  // Actualizar Ticket asociado
  try {
    const assoc = await hubspotClient.crm.associations.v4.basicApi.getPage(
      'deals', dealId, 'tickets', undefined, 1
    );
    if (assoc.results && assoc.results.length > 0) {
      const ticketId = assoc.results[0].toObjectId;
      await hubspotClient.crm.tickets.basicApi.update(ticketId, {
        properties: {
          punitorio_alquiler:  punitorioAlquiler.toString(),
          punitorio_servicios: punitorioServicios.toString(),
          total_punitorios:    totalPunitorios.toString()
        }
      });
    }
  } catch(e) {
    console.log('Ticket no encontrado o error al actualizar:', e.message);
  }

  callback({ outputFields: {} });
};
`.trim();

// ── Payload del workflow ───────────────────────────────────────────────────────
const WORKFLOW = {
  name: "WF — Cálculo Punitorios Seguimiento de Deuda",
  type: "PLATFORM_FLOW",
  flowType: "WORKFLOW",
  objectTypeId: "0-3",
  startActionId: "1",
  isEnabled: false,
  enrollmentCriteria: {
    shouldReEnroll: true,
    unEnrollObjectsNotMeetingCriteria: false,
    type: "LIST_BASED",
    listFilterBranch: {
      filterBranchType: "OR",
      filterBranchOperator: "OR",
      filterBranches: [
        {
          filterBranchType: "AND",
          filterBranchOperator: "AND",
          filterBranches: [],
          filters: [
            {
              filterType: "PROPERTY",
              property: "pipeline",
              operation: { operationType: "ENUMERATION", operator: "IS_ANY_OF", includeObjectsWithNoValueSet: false, values: ["3403406575"] }
            },
            {
              filterType: "PROPERTY",
              property: "tasa_punitorio",
              operation: { operationType: "ENUMERATION", operator: "IS_ANY_OF", includeObjectsWithNoValueSet: false, values: ["0_5_diario"] }
            }
          ]
        }
      ],
      filters: []
    },
    reEnrollmentTriggersFilterBranches: [
      {
        filterBranchType: "AND",
        filterBranchOperator: "AND",
        filterBranches: [],
        filters: [
          { filterType: "PROPERTY", property: "hs_name", operation: { operationType: "STRING", operator: "IS_EQUAL_TO", includeObjectsWithNoValueSet: false, value: "fecha_desembolso" } }
        ]
      }
    ]
  },
  actions: [
    {
      actionId: "1",
      actionTypeId: "0-8",
      actionTypeVersion: 0,
      type: "SINGLE_CONNECTION",
      fields: {
        codeType:    "JAVASCRIPT",
        code:        CUSTOM_CODE,
        secretNames: []
      }
    }
  ]
};

async function main() {
  console.log('Creando WF de punitorios...\n');
  const res = await api('POST', '/automation/v4/flows', WORKFLOW);

  if (res.id) {
    console.log('✅ Workflow creado');
    console.log('   ID:', res.id);
    console.log('   Nombre:', res.name);
    console.log('   Estado: DESHABILITADO (revisar antes de activar)');
    console.log('\n⚠️  PASOS MANUALES EN HUBSPOT:');
    console.log('   1. Automation → Workflows → buscar "WF — Cálculo Punitorios"');
    console.log('   2. Agregar trigger: Pipeline = Seguimiento de Deuda');
    console.log('      + fecha_desembolso es conocida');
    console.log('      + tasa_punitorio = 0.5% diario');
    console.log('   3. Activar re-enrollment');
    console.log('   4. Revisar el código del custom code action');
    console.log('   5. Activar el workflow');
  } else {
    console.log('❌ Error al crear el workflow:');
    console.log(JSON.stringify(res, null, 2));
  }
}

main().catch(e => console.error('Error:', e.message));
