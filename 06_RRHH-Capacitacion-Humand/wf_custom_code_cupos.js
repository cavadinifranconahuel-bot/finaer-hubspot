// CUSTOM CODE — Workflow: Control de Cupos Capacitación Humand
// Secret requerido: token
// Input:  turno  (propiedad del contacto: turno_capacitacion_humand)
// Output: cupoLleno ("true"/"false"), turnoLabel, totalActual

const https   = require('https');
const hubspot = require('@hubspot/api-client');

const FORM_ID  = 'afcadf5d-3a40-4844-b3a4-4df144c9bebb';
const CUPO_MAX = 30;
const OWNER_ID = '31770857'; // Franco Cavadini

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
      if (v.name === 'recursos_inscribir_humand')  recursos.push(v.value);
      if (v.name === 'turno_capacitacion_humand')  thisTurno = v.value;
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

  // Leer todos los envíos del formulario paginando
  let all = [], url = `/form-integrations/v1/submissions/forms/${FORM_ID}?limit=50`;
  do {
    const r = await apiGet(url, token);
    all = all.concat(r.results || []);
    url = r.paging?.next?.link?.replace('https://api.hubapi.com', '') || null;
  } while (url);

  const totalActual   = countUnique(all, turno);
  const totalAnterior = countUnique(all.slice(1), turno); // excluye envío más reciente
  const cruzoUmbral   = totalAnterior < CUPO_MAX && totalActual >= CUPO_MAX;

  // Cuando se cruza el umbral: crear tarea para Franco → campana + email
  if (cruzoUmbral) {
    const label = TURNOS[turno];
    await client.apiRequest({
      method: 'POST',
      path:   '/crm/v3/objects/tasks',
      body:   {
        properties: {
          hs_task_subject:  `¡Cupo lleno! ${label} — Capacitación Humand`,
          hs_task_body:     `El turno "${label}" alcanzó ${CUPO_MAX} inscriptos (total actual: ${totalActual}). Cerrá las inscripciones para este turno.`,
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
