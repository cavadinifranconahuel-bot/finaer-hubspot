// Batch: deriva periodo_de_deuda a partir de fecha_desde_que_adeuda
// Alcance: tickets en pipeline 3353793749, sin periodo_de_deuda, creados desde 02/07/2026
// Solo procesa fechas de 2026 (enum no tiene valores de 2025)

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const TOKEN = process.env.HUBSPOT_TOKEN;
const PIPELINE = '3353793749';
const DESDE = new Date('2026-07-02').getTime();

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

async function api(method, path, body) {
  const resp = await fetch('https://api.hubapi.com' + path, {
    method,
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!resp.ok) throw new Error(method + ' ' + path + ' → ' + resp.status + ': ' + await resp.text());
  return resp.json();
}

async function fetchTickets() {
  const tickets = [];
  let after = undefined;
  while (true) {
    const body = {
      filterGroups: [{ filters: [
        { propertyName: 'hs_pipeline', operator: 'EQ', value: PIPELINE },
        { propertyName: 'periodo_de_deuda', operator: 'NOT_HAS_PROPERTY' },
        { propertyName: 'createdate', operator: 'GTE', value: String(DESDE) },
        { propertyName: 'fecha_desde_que_adeuda', operator: 'HAS_PROPERTY' }
      ]}],
      properties: ['fecha_desde_que_adeuda'],
      limit: 100,
      ...(after && { after })
    };
    const data = await api('POST', '/crm/v3/objects/tickets/search', body);
    tickets.push(...(data.results || []));
    console.log(`  Fetched ${tickets.length} / ${data.total}`);
    if (!data.paging?.next?.after) break;
    after = data.paging.next.after;
  }
  return tickets;
}

async function run() {
  console.log('Obteniendo tickets...');
  const tickets = await fetchTickets();

  const updates = [];
  let saltados2025 = 0;
  let sinFecha = 0;

  for (const t of tickets) {
    const ts = t.properties.fecha_desde_que_adeuda;
    if (!ts) { sinFecha++; continue; }
    const [anio, mesNum] = ts.split('-').map(Number);
    if (anio !== 2026) { saltados2025++; continue; }
    const mes = MESES[mesNum - 1];
    updates.push({ id: t.id, properties: { periodo_de_deuda: `${mes} - ${anio}` } });
  }

  console.log(`\nResumen:`);
  console.log(`  Total fetched: ${tickets.length}`);
  console.log(`  A actualizar (2026): ${updates.length}`);
  console.log(`  Saltados (año != 2026): ${saltados2025}`);
  console.log(`  Sin fecha: ${sinFecha}`);

  if (updates.length === 0) { console.log('Nada que actualizar.'); return; }

  // Batch PATCH en grupos de 100
  let ok = 0;
  let errores = 0;
  for (let i = 0; i < updates.length; i += 100) {
    const chunk = updates.slice(i, i + 100);
    try {
      await api('POST', '/crm/v3/objects/tickets/batch/update', { inputs: chunk });
      ok += chunk.length;
      console.log(`  Batch ${Math.floor(i/100)+1}: OK (${ok}/${updates.length})`);
    } catch (e) {
      errores += chunk.length;
      console.error(`  Batch ${Math.floor(i/100)+1}: ERROR — ${e.message}`);
    }
  }

  console.log(`\nFinalizado: ${ok} actualizados, ${errores} errores`);
}

run().catch(console.error);
