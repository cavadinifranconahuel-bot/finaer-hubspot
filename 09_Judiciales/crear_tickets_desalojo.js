/**
 * crear_tickets_desalojo.js
 * Crea tickets en HubSpot (pipeline Judicial - Desalojo) a partir del
 * Excel DESALOJOS, para los expedientes que aún no tienen ticket.
 *
 * Solo crea tickets con ESTADO válido (TRASLADO, SORTEO, PRUEBA, etc.).
 * Expedientes con ESTADO vacío se omiten.
 *
 * Fuente: Excel C:/Users/Usuario/Downloads/DESALOJOS AL 15-9 (1).xlsx
 * Columnas:
 *   [0]  Expediente           → nro_expediente
 *   [1]  Solicitante          → nombre_y_apellido_del_inquilino
 *   [2]  Autos                → caratula
 *   [3]  Expediente PJN       → nro_expediente_pjn
 *   [4]  Fecha sorteo         → fecha_sorteo (serial Excel)
 *   [5]  ESTADO               → hs_pipeline_stage
 *   [6]  OBSERVACION          → observacion_ultimo_movimiento
 *   [7]  Fecha último mov     → fecha_ultimo_mov_judicial (serial Excel)
 *   [9]  Vto. CL              → vencimiento_contrato (texto DD/MM/YYYY)
 *   [10] Inmueble             → direccion_del_inmueble
 *   [11] Localidad            → jurisdiccion_judicial (inferida)
 *   [13] INMOBILIARIA         → asociación Company
 *
 * Pipeline: 4079402191 (Judicial - Desalojo)
 *
 * Uso:
 *   node crear_tickets_desalojo.js             → dry-run (muestra primeros 5)
 *   node crear_tickets_desalojo.js --ejecutar  → crea en HubSpot
 */

const https = require('https');
const XLSX  = require('C:/Users/Usuario/OneDrive/Desktop/HubSpot/02_Incumplimientos/scripts/node_modules/xlsx');

const TOKEN   = process.env.HUBSPOT_TOKEN;
const DRY_RUN = !process.argv.includes('--ejecutar');

const PIPELINE = '4079402191';

const STAGE_MAP = {
  'TRASLADO':              '5944154360',
  'SENTENCIA/LANZAMIENTO': '5944155322',
  'PRUEBA':                '5944154361',
  'SORTEO':                '5944154359',
  'EXHORTO':               '5944155323',
  'INICIO':                '5944154358'
};
const STAGE_NAMES = {
  '5944154358': 'Inicio',
  '5944154359': 'Sorteo',
  '5944154360': 'Traslado',
  '5944154361': 'Prueba',
  '5944155322': 'Sentencia/Lanzamiento',
  '5944155323': 'Exhorto'
};

const EXCEL_FILE = 'C:/Users/Usuario/Downloads/DESALOJOS AL 15-9 (1).xlsx';

// ── Helpers ───────────────────────────────────────────────────────────────

// Convierte serial de Excel a timestamp Unix (ms)
function excelSerialAMs(serial) {
  if (!serial || isNaN(serial)) return null;
  const ts = (Number(serial) - 25569) * 86400 * 1000;
  return isNaN(ts) ? null : ts.toString();
}

// Convierte "DD/MM/YYYY" a timestamp Unix (ms)
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

function inferirJurisdiccion(localidad) {
  if (!localidad) return null;
  const l = String(localidad).toUpperCase();
  if (l.includes('CABA') || l.includes('CIUDAD AUTONOMA') || l.includes('CAPITAL FEDERAL')) return 'caba';
  return 'provincia';
}

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req  = https.request({
      hostname: 'api.hubapi.com', path, method,
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
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
    r.b.results.forEach(t => { if (t.properties.nro_expediente) set.add(t.properties.nro_expediente.trim()); });
    after = r.b.paging?.next?.after;
  } while (after);
  return set;
}

// ── Buscar companies por nombre ───────────────────────────────────────────

async function buscarCompanies(nombres) {
  const mapa = {};
  const unicos = [...new Set(nombres.filter(Boolean))];
  console.log(`\nBuscando ${unicos.length} inmobiliarias únicas...`);
  for (const nombre of unicos) {
    const token = nombre.split(' ')[0];
    const r = await api('POST', '/crm/v3/objects/companies/search', {
      filterGroups: [{ filters: [{ propertyName: 'name', operator: 'CONTAINS_TOKEN', value: token }] }],
      properties: ['name'], limit: 5
    });
    if (r.s === 200 && r.b.results.length > 0) {
      const match = r.b.results.find(c =>
        c.properties.name?.toLowerCase().includes(nombre.substring(0, 10).toLowerCase())
      ) || r.b.results[0];
      mapa[nombre] = match.id;
      console.log(`  ✓ "${nombre}" → ${match.id} (${match.properties.name})`);
    } else {
      console.log(`  ✗ "${nombre}" → no encontrada`);
      mapa[nombre] = null;
    }
  }
  return mapa;
}

// ── Asociar company a ticket ──────────────────────────────────────────────

async function asociarCompany(ticketId, companyId) {
  const r = await api('PUT',
    `/crm/v4/objects/tickets/${ticketId}/associations/companies/${companyId}`,
    [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 26 }]);
  return r.s;
}

// ── Principal ─────────────────────────────────────────────────────────────

async function main() {
  if (!TOKEN) { console.error('Falta HUBSPOT_TOKEN'); process.exit(1); }

  // 1. Leer Excel
  const wb   = XLSX.readFile(EXCEL_FILE);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  console.log(`Excel: ${rows.length - 1} filas`);

  // 2. Tickets existentes en HubSpot
  console.log('Obteniendo tickets existentes en HubSpot...');
  const existentes = await fetchExistentes();
  console.log(`  ${existentes.size} ya existen`);

  // 3. Armar lista de tickets a crear
  const nuevos = [];
  let omitidosSinEstado = 0;

  rows.slice(1).forEach(r => {
    const exp    = String(r[0] || '').trim();
    const estado = String(r[5] || '').trim().toUpperCase();

    if (!exp || !/^\d{3,6}$/.test(exp)) return;
    if (existentes.has(exp)) return;
    if (!STAGE_MAP[estado]) { omitidosSinEstado++; return; }

    const solicitante  = String(r[1] || '').trim();
    const caratula     = String(r[2] || '').trim();
    const pjn          = String(r[3] || '').trim();
    const observacion  = String(r[6] || '').trim();
    const inmueble     = String(r[10] || '').trim();
    const localidad    = String(r[11] || '').trim();
    const inmobiliaria = String(r[13] || '').trim();

    const props = {
      subject:                          `Desalojo - ${solicitante} - ${exp}`,
      hs_pipeline:                      PIPELINE,
      hs_pipeline_stage:                STAGE_MAP[estado],
      nro_expediente:                   exp,
      nombre_y_apellido_del_inquilino:  solicitante,
      caratula:                         caratula,
      nro_expediente_pjn:               pjn,
      observacion_ultimo_movimiento:    observacion
    };

    const fechaSorteo = convertirFecha(r[4]);
    const fechaUltMov = convertirFecha(r[7]);
    const vtoCL       = convertirFecha(r[9]);

    if (fechaSorteo) props.fecha_sorteo              = fechaSorteo;
    if (fechaUltMov) props.fecha_ultimo_mov_judicial = fechaUltMov;
    if (vtoCL)       props.vencimiento_contrato      = vtoCL;
    if (inmueble)    props.direccion_del_inmueble    = inmueble;

    const jurisdiccion = inferirJurisdiccion(localidad);
    if (jurisdiccion)  props.jurisdiccion_judicial   = jurisdiccion;

    nuevos.push({ properties: props, _expediente: exp, _inmobiliaria: inmobiliaria, _estado: estado });
  });

  // Resumen
  const dist = {};
  nuevos.forEach(n => {
    const s = STAGE_NAMES[n.properties.hs_pipeline_stage];
    dist[s] = (dist[s] || 0) + 1;
  });

  console.log('\n=== RESUMEN ===');
  console.log(`A crear: ${nuevos.length}`);
  console.log(`Omitidos (ESTADO vacío): ${omitidosSinEstado}`);
  console.log('Distribución por etapa:');
  Object.entries(dist).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  if (DRY_RUN) {
    console.log('\n=== DRY RUN — primeros 5 ===');
    nuevos.slice(0, 5).forEach((n, i) => {
      console.log(`\n[${i+1}] Exp ${n._expediente} | ${STAGE_NAMES[n.properties.hs_pipeline_stage]} | "${n._inmobiliaria}"`);
      console.log(`  subject:  ${n.properties.subject}`);
      console.log(`  caratula: ${n.properties.caratula?.substring(0, 70)}`);
      console.log(`  nro_pjn:  ${n.properties.nro_expediente_pjn}`);
      console.log(`  inmueble: ${n.properties.direccion_del_inmueble}`);
    });
    console.log('\nEjecutá con --ejecutar para crear en HubSpot.');
    return;
  }

  // ── Ejecutar ──────────────────────────────────────────────────────────

  const mapaCompanies = await buscarCompanies(nuevos.map(n => n._inmobiliaria));

  const BATCH_SIZE = 100;
  const creados = [];
  let erroresBatch = 0;

  for (let i = 0; i < nuevos.length; i += BATCH_SIZE) {
    const batch = nuevos.slice(i, i + BATCH_SIZE);
    console.log(`\nBatch ${Math.floor(i/BATCH_SIZE)+1}: ${batch.length} tickets...`);

    const r = await api('POST', '/crm/v3/objects/tickets/batch/create', {
      inputs: batch.map(n => ({ properties: n.properties }))
    });

    if (r.s === 201) {
      r.b.results.forEach((ticket, idx) => {
        const inmob     = batch[idx]?._inmobiliaria;
        const companyId = inmob ? mapaCompanies[inmob] : null;
        creados.push({ ticketId: ticket.id, companyId });
      });
      console.log(`  ✓ ${r.b.results.length} creados`);
    } else {
      erroresBatch++;
      console.error(`  ERROR ${r.s}:`, JSON.stringify(r.b).slice(0, 400));
    }
  }

  // Asociar companies
  console.log(`\nAsociando companies (${creados.filter(t => t.companyId).length} con match)...`);
  let asociados = 0, sinCompany = 0, errorAsoc = 0;

  for (const { ticketId, companyId } of creados) {
    if (!companyId) { sinCompany++; continue; }
    const s = await asociarCompany(ticketId, companyId);
    if (s >= 200 && s < 300) asociados++;
    else { errorAsoc++; console.error(`  Error ticket ${ticketId}: HTTP ${s}`); }
  }

  console.log('\n=== RESULTADO FINAL ===');
  console.log(`Tickets creados:     ${creados.length}`);
  console.log(`Companies asociadas: ${asociados}`);
  console.log(`Sin match company:   ${sinCompany}`);
  console.log(`Errores batch:       ${erroresBatch}`);
  console.log(`Errores asociación:  ${errorAsoc}`);
}

main().catch(console.error);
