const https = require('https');

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.hubapi.com', path, method,
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(c).toString()) }); }
        catch { resolve({ status: res.statusCode, body: Buffer.concat(c).toString() }); }
      });
    }).on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const FORM_ID = 'afcadf5d-3a40-4844-b3a4-4df144c9bebb';

const SOURCE_CODE = `
const https   = require('https');
const hubspot = require('@hubspot/api-client');

const FORM_ID  = 'afcadf5d-3a40-4844-b3a4-4df144c9bebb';
const CUPO_MAX = 30;
const OWNER_ID = '31770857';

const TURNOS = {
  miercoles_1_julio: 'Miércoles 1 de Julio',
  jueves_2_julio:    'Jueves 2 de Julio',
  lunes_6_julio:     'Lunes 6 de Julio',
  martes_7_julio:    'Martes 7 de Julio'
};

function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    https.request({
      hostname: 'api.hubapi.com', path, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(c).toString())); }
        catch (e) { resolve({}); }
      });
    }).on('error', reject).end();
  });
}

function countUnique(submissions, turno) {
  const s = new Set();
  for (const sub of submissions) {
    const recursos = [];
    let thisTurno = null;
    (sub.values || []).forEach(v => {
      if (v.name === 'recursos_inscribir_humand') recursos.push(v.value);
      if (v.name === 'turno_capacitacion_humand') thisTurno = v.value;
    });
    if (thisTurno !== turno) continue;
    recursos.forEach(r => s.add(r.trim().toLowerCase()));
  }
  return s.size;
}

exports.main = async (event, callback) => {
  const token  = process.env.token;
  const client = new hubspot.Client({ accessToken: token });
  const turno  = event.inputFields['turno'];

  if (!turno || !TURNOS[turno]) {
    return callback({ outputFields: { cupoLleno: 'false', turnoLabel: turno || '', totalActual: '0' } });
  }

  let all = [], url = '/form-integrations/v1/submissions/forms/' + FORM_ID + '?limit=50';
  do {
    const r = await apiGet(url, token);
    all = all.concat(r.results || []);
    url = r.paging && r.paging.next && r.paging.next.link
      ? r.paging.next.link.replace('https://api.hubapi.com', '')
      : null;
  } while (url);

  const totalActual   = countUnique(all, turno);
  const totalAnterior = countUnique(all.slice(1), turno);
  const cruzoUmbral   = totalAnterior < CUPO_MAX && totalActual >= CUPO_MAX;

  if (cruzoUmbral) {
    const label = TURNOS[turno];
    await client.apiRequest({
      method: 'POST',
      path:   '/crm/v3/objects/tasks',
      body:   {
        properties: {
          hs_task_subject:  '¡Cupo lleno! ' + label + ' — Capacitación Humand',
          hs_task_body:     'El turno "' + label + '" alcanzó ' + CUPO_MAX + ' inscriptos (total actual: ' + totalActual + '). Cerrá las inscripciones para este turno.',
          hs_task_status:   'NOT_STARTED',
          hs_task_type:     'TODO',
          hubspot_owner_id: OWNER_ID,
          hs_timestamp:     Date.now().toString()
        }
      }
    });
  }

  callback({ outputFields: {
    cupoLleno:   cruzoUmbral ? 'true' : 'false',
    turnoLabel:  TURNOS[turno],
    totalActual: String(totalActual)
  }});
};
`.trim();

const WF = {
  name: 'WF — Control de Cupos Capacitación Humand',
  type: 'CONTACT_FLOW',
  flowType: 'WORKFLOW',
  objectTypeId: '0-1',
  isEnabled: false,
  startActionId: '1',
  enrollmentCriteria: {
    shouldReEnroll: true,
    listFilterBranch: {
      filterBranches: [{
        filterBranches: [],
        filters: [{
          formId: FORM_ID,
          operator: 'FILLED_OUT',
          filterType: 'FORM_SUBMISSION'
        }],
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
        formId: FORM_ID,
        operator: 'FILLED_OUT',
        filterType: 'FORM_SUBMISSION'
      }],
      filterBranchType: 'AND',
      filterBranchOperator: 'AND'
    }],
    unEnrollObjectsNotMeetingCriteria: false,
    type: 'LIST_BASED'
  },
  actions: [{
    actionId: '1',
    type: 'CUSTOM_CODE',
    secretNames: ['token'],
    sourceCode: SOURCE_CODE,
    runtime: 'NODE20X',
    inputFields: [{
      name: 'turno',
      value: {
        propertyName: 'turno_capacitacion_humand',
        type: 'OBJECT_PROPERTY'
      }
    }],
    outputFields: []
  }]
};

(async () => {
  console.log('Creando workflow "WF — Control de Cupos Capacitación Humand"...');
  const r = await api('POST', '/automation/v4/flows', WF);
  if (r.status === 200 || r.status === 201) {
    console.log(`✓ Workflow creado. ID: ${r.body.id}`);
    console.log(`  Portal: https://app-eu1.hubspot.com/workflows/145725856/platform/flow/${r.body.id}/edit`);
  } else {
    console.log(`✗ Error ${r.status}:`);
    console.log(JSON.stringify(r.body, null, 2));
  }
})();
