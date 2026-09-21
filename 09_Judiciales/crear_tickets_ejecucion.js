/**
 * crear_tickets_ejecucion.js
 * Crea tickets en HubSpot (pipeline Judicial - Ejecución) a partir del
 * Excel de ejecuciones, procesando las 3 hojas como stages distintos.
 *
 * Hojas → Stage:
 *   "Ejecucion Inicio"        → Inicio           (5944783060)
 *   "Ejec via preparada"      → Vía Preparada     (5944783063)
 *   "sentencia trance y remate" → Sentencia       (5944783064)
 *
 * Columnas (común a las 3 hojas):
 *   [0] nro caso          → nro_expediente (clave de dedup)
 *   [1] solicitante       → nombre_y_apellido_del_inquilino
 *   [2] autos             → caratula
 *   [3] nro expediente    → nro_expediente_pjn
 *   [4] fecha sorteo      → fecha_sorteo
 *   [5] fecha ult. mov.   → fecha_ultimo_mov_judicial
 *   [7] ultimo movimiento → observacion_ultimo_movimiento
 *
 * Uso:
 *   node crear_tickets_ejecucion.js             → dry-run (muestra primeros 5 por hoja)
 *   node crear_tickets_ejecucion.js --ejecutar  → crea en HubSpot
 */

const https = require('https');
const XLSX  = require('C:/Users/Usuario/OneDrive/Desktop/HubSpot/02_Incumplimientos/scripts/node_modules/xlsx');

const TOKEN   = process.env.HUBSPOT_TOKEN;
const DRY_RUN = !process.argv.includes('--ejecutar');

const PIPELINE = '4079393008';

const HOJAS = [
  { nombre: 'Ejecucion Inicio ',       stageId: '5944783060', stageName: 'Inicio'        },
  { nombre: 'Ejec via preparada',      stageId: '5944783063', stageName: 'Vía Preparada'  },
  { nombre: 'sentencia trance y remate', stageId: '5944783064', stageName: 'Sentencia'   },
];

const EXCEL_FILE = 'C:/Users/Usuario/Downloads/Hoja de cálculo sin título (1).xlsx';

// ── Helpers ───────────────────────────────────────────────────────────────

function excelSerialAMs(serial) {
  if (!serial || isNaN(serial)) return null;
  const ts = (Number(serial) - 25569) * 86400 * 1000;
  return isNaN(ts) ? null : ts.toString();
}

function fechaTextoAMs(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const ts = Date.UTC(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  return isNaN(ts) ? null : ts.toString();
}

function convertirFecha(val) {
  if (!val) return null;
  if (typeof val === 'number') return excelSerialAMs(val);
  return fechaTextoAMs(String(val).trim());
}

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req  = https.request({
      hostname: 'api.hubapi.com', path, method,
      headers: {
        'Authorization':  'Bearer ' + TOKEN,
        'Content-Type':   'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try { resolve({ s: res.statusCode, b: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch(e) { resolve({ s: res.statusCode, b: Buffer.concat(chunks).toString() }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Traer expedientes existentes en HubSpot ───────────────────────────────

async function fetchExistentes() {
  const set = new Set();
  let after;
  do {
    const r = await api('POST', '/crm/v3/objects/tickets/search', {
      filterGroups: [{ filters: [{ propertyName: 'hs_pipeline', operator: 'EQ', value: PIPELINE }] }],
      properties: ['nro_expediente'], limit: 100, ...(after ? { after } : {})
    });
    r.b.results.forEach(t => {
      if (t.properties.nro_expediente) set.add(String(t.properties.nro_expediente).trim());
    });
    after = r.b.paging?.next?.after;
  } while (after);
  return set;
}

// ── Principal ─────────────────────────────────────────────────────────────

async function main() {
  if (!TOKEN) { console.error('Falta HUBSPOT_TOKEN en el entorno'); process.exit(1); }

  const wb = XLSX.readFile(EXCEL_FILE);
  console.log('Hojas en el Excel:', wb.SheetNames.join(', '));

  console.log('\nObteniendo tickets existentes en HubSpot...');
  const existentes = await fetchExistentes();
  console.log(`  ${existentes.size} ya existen en el pipeline`);

  const todosPorHoja = [];

  for (const hoja of HOJAS) {
    const sheet = wb.Sheets[hoja.nombre];
    if (!sheet) { console.warn(`⚠ Hoja no encontrada: "${hoja.nombre}"`); continue; }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const nuevos = [];
    let omitidos = 0;

    rows.slice(1).forEach(r => {
      const nroCaso = String(r[0] || '').trim();
      if (!nroCaso || !/^\d+$/.test(nroCaso)) { omitidos++; return; }
      if (existentes.has(nroCaso)) { omitidos++; return; }

      const solicitante = String(r[1] || '').trim();
      const caratula    = String(r[2] || '').trim();
      const pjn         = String(r[3] || '').trim();
      const observacion = String(r[7] || '').trim();

      const props = {
        subject:                         `Ejecución - ${solicitante} - ${nroCaso}`,
        hs_pipeline:                     PIPELINE,
        hs_pipeline_stage:               hoja.stageId,
        nro_expediente:                  nroCaso,
        nombre_y_apellido_del_inquilino: solicitante,
        caratula:                        caratula,
        nro_expediente_pjn:              pjn,
        observacion_ultimo_movimiento:   observacion,
      };

      const fechaSorteo = convertirFecha(r[4]);
      const fechaUltMov = convertirFecha(r[5]);
      if (fechaSorteo) props.fecha_sorteo              = fechaSorteo;
      if (fechaUltMov) props.fecha_ultimo_mov_judicial = fechaUltMov;

      nuevos.push({ properties: props });
    });

    todosPorHoja.push({ hoja, nuevos, omitidos });
  }

  // Resumen
  const totalNuevos = todosPorHoja.reduce((s, h) => s + h.nuevos.length, 0);
  console.log('\n=== RESUMEN ===');
  todosPorHoja.forEach(({ hoja, nuevos, omitidos }) => {
    console.log(`  ${hoja.stageName}: ${nuevos.length} a crear, ${omitidos} omitidos`);
  });
  console.log(`  TOTAL: ${totalNuevos} tickets a crear`);

  if (DRY_RUN) {
    todosPorHoja.forEach(({ hoja, nuevos }) => {
      console.log(`\n=== DRY RUN — ${hoja.stageName} (primeros 3) ===`);
      nuevos.slice(0, 3).forEach((n, i) => {
        console.log(`\n[${i+1}] ${n.properties.subject}`);
        console.log(`  nro_pjn:  ${n.properties.nro_expediente_pjn}`);
        console.log(`  caratula: ${n.properties.caratula?.substring(0, 80)}`);
        console.log(`  obs:      ${n.properties.observacion_ultimo_movimiento?.substring(0, 80)}`);
      });
    });
    console.log('\nEjecutá con --ejecutar para crear en HubSpot.');
    return;
  }

  // ── Ejecutar ──────────────────────────────────────────────────────────────
  const BATCH_SIZE = 100;
  let totalCreados = 0, totalErrores = 0;

  for (const { hoja, nuevos } of todosPorHoja) {
    if (nuevos.length === 0) { console.log(`\n${hoja.stageName}: nada que crear.`); continue; }
    console.log(`\n${hoja.stageName}: creando ${nuevos.length} tickets...`);

    for (let i = 0; i < nuevos.length; i += BATCH_SIZE) {
      const batch = nuevos.slice(i, i + BATCH_SIZE);
      const r = await api('POST', '/crm/v3/objects/tickets/batch/create', {
        inputs: batch.map(n => ({ properties: n.properties }))
      });

      if (r.s === 201) {
        totalCreados += r.b.results.length;
        console.log(`  Batch ${Math.floor(i/BATCH_SIZE)+1}: ✓ ${r.b.results.length} creados`);
      } else {
        totalErrores++;
        console.error(`  Batch ${Math.floor(i/BATCH_SIZE)+1}: ERROR ${r.s}:`, JSON.stringify(r.b).slice(0, 300));
      }
    }
  }

  console.log('\n=== RESULTADO FINAL ===');
  console.log(`Tickets creados: ${totalCreados}`);
  console.log(`Errores de batch: ${totalErrores}`);
}

main().catch(console.error);
