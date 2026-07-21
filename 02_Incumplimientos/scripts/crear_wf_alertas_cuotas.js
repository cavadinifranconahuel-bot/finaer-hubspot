// crear_wf_alertas_cuotas.js
// Crea 4 WFs de alertas por email para cuotas y promesas de pago (Mora 2)
// WF1: Alerta Cuota 1  (1 día antes + día de vencimiento)
// WF2: Alerta Cuota 2  (ídem, filtro cantidad_de_cuotas >= 2)
// WF3: Alerta Cuota 3  (ídem, filtro cantidad_de_cuotas = 3)
// WF4: Alerta Cuota Vencida (cuando estado_cuota_X cambia a "Vencida")
//
// node crear_wf_alertas_cuotas.js

const https = require('https');
const TOKEN = process.env.HUBSPOT_TOKEN || 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const PIPELINE = '3403406575';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = data.length;
    const req = https.request({ hostname: 'api.hubapi.com', path, method, headers }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(c).toString('utf8'))); }
        catch (e) { resolve({ _raw: Buffer.concat(c).toString('utf8') }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── SMTP helper (embebido en cada custom code) ────────────────────────────────

const SMTP_HELPER = `
const net = require('net');
const tls = require('tls');

async function enviarEmail(smtpUser, smtpPass, toEmail, subject, htmlBody) {
  const FROM = 'incumplimientos@finaersa.com.ar';
  const SMTP_HOST = 'smtp.hubapi.com';
  const SMTP_PORT = 587;
  const htmlB64 = Buffer.from(htmlBody, 'utf8').toString('base64').match(/.{1,76}/g).join('\\r\\n');
  const mime = [
    'MIME-Version: 1.0',
    'From: Incumplimientos FINAER <' + FROM + '>',
    'To: ' + toEmail,
    'Subject: =?UTF-8?B?' + Buffer.from(subject, 'utf8').toString('base64') + '?=',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlB64
  ].join('\\r\\n');

  return new Promise((resolve, reject) => {
    let sock = null, tlsSock = null, lineBuffer = '', state = 'GREETING';
    const timer = setTimeout(() => reject(new Error('SMTP timeout en: ' + state)), 20000);
    const activeSock = () => tlsSock || sock;
    const write = (l) => activeSock().write(l + '\\r\\n');
    const onLine = (line) => {
      if (!line || line.length < 3 || line[3] === '-') return;
      const code = parseInt(line.slice(0, 3), 10);
      if (code >= 400) { clearTimeout(timer); return reject(new Error('SMTP [' + state + ']: ' + line)); }
      if (state === 'GREETING' && code === 220) { state = 'EHLO1'; write('EHLO finaer-wf'); }
      else if (state === 'EHLO1' && code === 250) { state = 'STARTTLS'; write('STARTTLS'); }
      else if (state === 'STARTTLS' && code === 220) {
        sock.removeAllListeners('data');
        tlsSock = tls.connect({ socket: sock, servername: SMTP_HOST }, () => { state = 'EHLO2'; tlsSock.write('EHLO finaer-wf\\r\\n'); });
        tlsSock.on('data', onData); tlsSock.on('error', (e) => { clearTimeout(timer); reject(e); });
      }
      else if (state === 'EHLO2' && code === 250) { state = 'AUTH'; write('AUTH LOGIN'); }
      else if (state === 'AUTH' && code === 334) { state = 'USER'; write(Buffer.from(smtpUser).toString('base64')); }
      else if (state === 'USER' && code === 334) { state = 'PASS'; write(Buffer.from(smtpPass).toString('base64')); }
      else if (state === 'PASS' && code === 235) { state = 'MAIL'; write('MAIL FROM:<' + FROM + '>'); }
      else if (state === 'MAIL' && code === 250) { state = 'RCPT'; write('RCPT TO:<' + toEmail + '>'); }
      else if (state === 'RCPT' && code === 250) { state = 'DATA'; write('DATA'); }
      else if (state === 'DATA' && code === 354) { state = 'BODY'; activeSock().write(mime + '\\r\\n.\\r\\n'); }
      else if (state === 'BODY' && code === 250) { state = 'QUIT'; write('QUIT'); }
      else if (state === 'QUIT' && code === 221) { clearTimeout(timer); activeSock().destroy(); resolve(); }
    };
    const onData = (d) => {
      lineBuffer += d.toString('ascii');
      const lines = lineBuffer.split('\\r\\n'); lineBuffer = lines.pop();
      for (const l of lines) onLine(l);
    };
    sock = net.createConnection({ host: SMTP_HOST, port: SMTP_PORT });
    sock.on('data', onData);
    sock.on('error', (e) => { clearTimeout(timer); reject(e); });
    sock.on('close', () => { if (state !== 'QUIT') { clearTimeout(timer); reject(new Error('SMTP cerrado en: ' + state)); } });
  });
}
`;

// ── Generador de custom code ──────────────────────────────────────────────────

function makeCode(cuotaN, tipo) {
  // tipo: 'manana' | 'hoy' | 'vencida'
  const montoProp = `monto_cuota_${cuotaN}`;
  const fechaProp = `fecha_de_pago__cuota_${cuotaN}`;

  const asunto = tipo === 'manana'
    ? `Recordatorio: Cuota ${cuotaN} vence mañana`
    : tipo === 'hoy'
    ? `Cuota ${cuotaN} vence HOY`
    : `Cuota ${cuotaN} marcada como Vencida`;

  const cuerpo = tipo === 'manana'
    ? `La <strong>Cuota ${cuotaN}</strong> del expediente <strong>DEAL</strong> vence <strong>mañana</strong> (FECHA).<br><br>Monto: <strong>$ MONTO</strong>.`
    : tipo === 'hoy'
    ? `La <strong>Cuota ${cuotaN}</strong> del expediente <strong>DEAL</strong> vence <strong>hoy</strong> (FECHA) y figura sin pagar.<br><br>Monto: <strong>$ MONTO</strong>.`
    : `La <strong>Cuota ${cuotaN}</strong> del expediente <strong>DEAL</strong> fue marcada como <strong>Vencida</strong>.<br><br>Monto: <strong>$ MONTO</strong>.`;

  return SMTP_HELPER + `
const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  try {
    const client = new hubspot.Client({ accessToken: process.env.token });
    const ownerId = event.inputFields['hubspot_owner_id'];
    const dealName = event.inputFields['dealname'] || '(sin nombre)';
    const montoRaw = parseFloat(event.inputFields['${montoProp}'] || 0);
    const fechaRaw  = event.inputFields['${fechaProp}'];

    if (!ownerId) { console.log('Sin propietario, omitiendo alerta'); return callback({ outputFields: {} }); }

    const owner = await client.crm.owners.ownersApi.getById(parseInt(ownerId));
    const ownerEmail = owner.email;
    if (!ownerEmail) { console.log('Propietario sin email'); return callback({ outputFields: {} }); }

    const monto = montoRaw > 0
      ? montoRaw.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : '—';
    const fecha = fechaRaw
      ? new Date(isNaN(fechaRaw) ? fechaRaw : parseInt(fechaRaw))
          .toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Buenos_Aires' })
      : '—';

    const subject = '${asunto} — ' + dealName;
    const body = '<p>${cuerpo}</p>'
      .replace('DEAL', dealName).replace('FECHA', fecha).replace('MONTO', monto);

    await enviarEmail(process.env.HS_SMTP_USER, process.env.HS_SMTP_PASS, ownerEmail, subject, body);
    console.log('Alerta cuota ${cuotaN} (${tipo}) enviada a:', ownerEmail);
    callback({ outputFields: {} });
  } catch (err) {
    console.error('Error alerta cuota ${cuotaN} (${tipo}):', err.message);
    callback({ outputFields: {} }); // no bloquear el WF
  }
};
`;
}

// ── Helpers de acciones ───────────────────────────────────────────────────────

function actionEsperarFecha(id, propFecha, nextId) {
  return {
    actionId: id,
    actionTypeId: '0-35',
    actionTypeVersion: 0,
    type: 'SINGLE_CONNECTION',
    fields: {
      date: { propertyName: propFecha, type: 'OBJECT_PROPERTY' },
      delta: '-1',
      time_unit: 'DAYS',
      time_of_day: { hour: 8, minute: 0 }
    },
    connection: { edgeType: 'STANDARD', nextActionId: nextId }
  };
}

function actionDelay1Dia(id, nextId) {
  return {
    actionId: id,
    actionTypeId: '0-1',
    actionTypeVersion: 0,
    type: 'SINGLE_CONNECTION',
    fields: { delta: '1', time_unit: 'DAYS' },
    connection: { edgeType: 'STANDARD', nextActionId: nextId }
  };
}

function actionBranchNoPagada(id, propEstado, nextIfMatch) {
  // Si estado ≠ Pagada → nextIfMatch; si Pagada → termina el WF
  return {
    actionId: id,
    listBranches: [{
      filterBranch: {
        filterBranchType: 'OR',
        filterBranchOperator: 'OR',
        filterBranches: [{
          filterBranchType: 'AND',
          filterBranchOperator: 'AND',
          filterBranches: [],
          filters: [{
            filterType: 'PROPERTY',
            property: propEstado,
            operation: {
              operationType: 'ENUMERATION',
              operator: 'IS_NONE_OF',
              values: ['Pagada'],
              includeObjectsWithNoValueSet: true
            }
          }]
        }],
        filters: []
      },
      branchName: 'Sin pagar',
      connection: { edgeType: 'STANDARD', nextActionId: nextIfMatch }
    }],
    type: 'LIST_BRANCH'
  };
}

function actionBranchVencida(id, propEstado, nextIfMatch, nextDefault) {
  const branch = {
    actionId: id,
    listBranches: [{
      filterBranch: {
        filterBranchType: 'OR',
        filterBranchOperator: 'OR',
        filterBranches: [{
          filterBranchType: 'AND',
          filterBranchOperator: 'AND',
          filterBranches: [],
          filters: [{
            filterType: 'PROPERTY',
            property: propEstado,
            operation: {
              operationType: 'ENUMERATION',
              operator: 'IS_ANY_OF',
              values: ['Vencida'],
              includeObjectsWithNoValueSet: false
            }
          }]
        }],
        filters: []
      },
      branchName: 'Vencida',
      connection: { edgeType: 'STANDARD', nextActionId: nextIfMatch }
    }],
    type: 'LIST_BRANCH'
  };
  if (nextDefault) {
    branch.defaultBranchName = 'No vencida';
    branch.defaultBranch = { edgeType: 'STANDARD', nextActionId: nextDefault };
  }
  return branch;
}

function actionNotif(id, cuotaN, tipo, inputFechaProp, inputMontoProp, nextId) {
  const action = {
    actionId: id,
    secretNames: ['token', 'HS_SMTP_USER', 'HS_SMTP_PASS'],
    sourceCode: makeCode(cuotaN, tipo),
    runtime: 'NODE20X',
    inputFields: [
      { name: 'hubspot_owner_id', value: { propertyName: 'hubspot_owner_id', type: 'OBJECT_PROPERTY' } },
      { name: 'dealname',         value: { propertyName: 'dealname',         type: 'OBJECT_PROPERTY' } },
      { name: `monto_cuota_${cuotaN}`,      value: { propertyName: inputMontoProp, type: 'OBJECT_PROPERTY' } },
      { name: `fecha_de_pago__cuota_${cuotaN}`, value: { propertyName: inputFechaProp, type: 'OBJECT_PROPERTY' } }
    ],
    outputFields: [],
    type: 'CUSTOM_CODE'
  };
  if (nextId) action.connection = { edgeType: 'STANDARD', nextActionId: nextId };
  return action;
}

// ── Enrollment helpers ────────────────────────────────────────────────────────

function enrollmentFechaConocida(propFecha, extraFiltros, reenrollProp) {
  const filtros = [
    { filterType: 'PROPERTY', property: 'pipeline', operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', values: [PIPELINE], includeObjectsWithNoValueSet: false } },
    { filterType: 'PROPERTY', property: propFecha,  operation: { operationType: 'ALL_PROPERTY', operator: 'IS_KNOWN' } },
    ...extraFiltros
  ];
  return {
    shouldReEnroll: true,
    unEnrollObjectsNotMeetingCriteria: false,
    type: 'LIST_BASED',
    listFilterBranch: {
      filterBranchType: 'OR',
      filterBranchOperator: 'OR',
      filterBranches: [{
        filterBranchType: 'AND',
        filterBranchOperator: 'AND',
        filterBranches: [],
        filters: filtros
      }],
      filters: []
    },
    reEnrollmentTriggersFilterBranches: [{
      filterBranchType: 'AND',
      filterBranchOperator: 'AND',
      filterBranches: [],
      filters: [{
        filterType: 'PROPERTY',
        property: 'hs_name',
        operation: { operationType: 'STRING', operator: 'IS_EQUAL_TO', includeObjectsWithNoValueSet: false, value: reenrollProp }
      }]
    }]
  };
}

function enrollmentVencida() {
  const makeFilter = (prop) => ({
    filterBranchType: 'AND',
    filterBranchOperator: 'AND',
    filterBranches: [],
    filters: [
      { filterType: 'PROPERTY', property: 'pipeline', operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', values: [PIPELINE], includeObjectsWithNoValueSet: false } },
      { filterType: 'PROPERTY', property: prop, operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', values: ['Vencida'], includeObjectsWithNoValueSet: false } }
    ]
  });
  return {
    shouldReEnroll: true,
    unEnrollObjectsNotMeetingCriteria: false,
    type: 'LIST_BASED',
    listFilterBranch: {
      filterBranchType: 'OR',
      filterBranchOperator: 'OR',
      filterBranches: [
        makeFilter('estado_cuota_1'),
        makeFilter('estado_cuota_2'),
        makeFilter('estado_cuota_3')
      ],
      filters: []
    },
    reEnrollmentTriggersFilterBranches: []
  };
}

// ── Payloads de los 4 WFs ────────────────────────────────────────────────────

function wfCuota(n, extraFiltros) {
  const fechaProp = `fecha_de_pago__cuota_${n}`;
  const montoProp = `monto_cuota_${n}`;
  const estadoProp = `estado_cuota_${n}`;

  return {
    name: `Mora 2 — Alerta Cuota ${n}`,
    type: 'PLATFORM_FLOW',
    flowType: 'WORKFLOW',
    objectTypeId: '0-3',
    isEnabled: false,
    startActionId: '1',
    nextAvailableActionId: '7',
    enrollmentCriteria: enrollmentFechaConocida(fechaProp, extraFiltros, fechaProp),
    actions: [
      actionEsperarFecha('1', fechaProp, '2'),
      actionBranchNoPagada('2', estadoProp, '3'),
      actionNotif('3', n, 'manana', fechaProp, montoProp, '4'),
      actionDelay1Dia('4', '5'),
      actionBranchNoPagada('5', estadoProp, '6'),
      actionNotif('6', n, 'hoy', fechaProp, montoProp, null)
    ]
  };
}

// WF4 se divide en 3 WFs independientes (uno por cuota).
// La API rechaza el patrón "diamond" donde una acción tiene 2 conexiones entrantes
// (branch match + branch default convergiendo en la misma acción siguiente).
function wfVencidaN(n) {
  const estadoProp = `estado_cuota_${n}`;
  const fechaProp  = `fecha_de_pago__cuota_${n}`;
  const montoProp  = `monto_cuota_${n}`;
  return {
    name: `Mora 2 — Alerta Cuota ${n} Vencida`,
    type: 'PLATFORM_FLOW',
    flowType: 'WORKFLOW',
    objectTypeId: '0-3',
    isEnabled: false,
    startActionId: '1',
    nextAvailableActionId: '2',
    enrollmentCriteria: {
      shouldReEnroll: true,
      unEnrollObjectsNotMeetingCriteria: false,
      type: 'LIST_BASED',
      listFilterBranch: {
        filterBranchType: 'OR',
        filterBranchOperator: 'OR',
        filterBranches: [{
          filterBranchType: 'AND',
          filterBranchOperator: 'AND',
          filterBranches: [],
          filters: [
            { filterType: 'PROPERTY', property: 'pipeline', operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', values: [PIPELINE], includeObjectsWithNoValueSet: false } },
            { filterType: 'PROPERTY', property: estadoProp, operation: { operationType: 'ENUMERATION', operator: 'IS_ANY_OF', values: ['Vencida'], includeObjectsWithNoValueSet: false } }
          ]
        }],
        filters: []
      },
      reEnrollmentTriggersFilterBranches: []
    },
    actions: [
      actionNotif('1', n, 'vencida', fechaProp, montoProp, null)
    ]
  };
}

// ── Filtros extra por cuota ───────────────────────────────────────────────────

const filtrosCuota2 = [{
  filterType: 'PROPERTY',
  property: 'cantidad_de_cuotas',
  operation: { operationType: 'NUMBER', operator: 'IS_GREATER_THAN_OR_EQUAL_TO', value: '2', includeObjectsWithNoValueSet: false }
}];

const filtrosCuota3 = [{
  filterType: 'PROPERTY',
  property: 'cantidad_de_cuotas',
  operation: { operationType: 'NUMBER', operator: 'IS_EQUAL_TO', value: '3', includeObjectsWithNoValueSet: false }
}];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // IDs creados en producción:
  //   WF1 Alerta Cuota 1         → 4602289342
  //   WF2 Alerta Cuota 2         → 4602290375
  //   WF3 Alerta Cuota 3         → 4602059988
  //   WF4 Alerta Cuota 1 Vencida → 4602303720
  //   WF5 Alerta Cuota 2 Vencida → 4602296535
  //   WF6 Alerta Cuota 3 Vencida → 4602015976
  const workflows = [
    { payload: wfCuota(1, []),            label: 'Alerta Cuota 1' },
    { payload: wfCuota(2, filtrosCuota2), label: 'Alerta Cuota 2' },
    { payload: wfCuota(3, filtrosCuota3), label: 'Alerta Cuota 3' },
    { payload: wfVencidaN(1),             label: 'Alerta Cuota 1 Vencida' },
    { payload: wfVencidaN(2),             label: 'Alerta Cuota 2 Vencida' },
    { payload: wfVencidaN(3),             label: 'Alerta Cuota 3 Vencida' }
  ];

  console.log('Creando WFs de alertas de cuotas...\n');

  for (const { payload, label } of workflows) {
    const res = await api('POST', '/automation/v4/flows', payload);
    if (res.id) {
      console.log(`✅ ${label}`);
      console.log(`   ID: ${res.id}`);
      console.log(`   Estado: DESACTIVADO — activar desde HubSpot UI`);
    } else {
      console.log(`❌ ${label}`);
      console.log(`   Error: ${JSON.stringify(res).slice(0, 400)}`);
    }
    console.log();
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
