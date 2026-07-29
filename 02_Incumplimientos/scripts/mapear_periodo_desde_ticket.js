// mapear_periodo_desde_ticket.js
// Asigna periodo_de_deuda a deals del pipeline de período sin ese valor,
// usando la fecha de creación del ticket asociado (o la del deal como fallback)
// node mapear_periodo_desde_ticket.js

const TOKEN = process.env.HUBSPOT_TOKEN;

const MESES = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo',     4: 'Abril',
  5: 'Mayo',  6: 'Junio',   7: 'Julio',     8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};

function fechaAPeriodo(fechaStr) {
  const d = new Date(fechaStr);
  return `${MESES[d.getMonth() + 1]} - ${d.getFullYear()}`;
}

async function post(fetch, url, body, headers) {
  const res  = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) console.error('HTTP error:', JSON.stringify(data).slice(0, 200));
  return data;
}

async function main() {
  const fetch   = (await import('node-fetch')).default;
  const headers = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  // ── 1. Buscar todos los deals sin periodo_de_deuda ────────────────────────
  console.log('1. Buscando deals sin periodo_de_deuda...');
  const deals = [];
  let after   = undefined;
  do {
    const data = await post(fetch, 'https://api.hubapi.com/crm/v3/objects/deals/search', {
      filterGroups: [{ filters: [{ propertyName: 'pipeline', operator: 'EQ', value: '3403406575' }] }],
      properties:   ['hs_createdate', 'periodo_de_deuda'],
      limit: 100,
      ...(after ? { after } : {})
    }, headers);
    for (const d of data.results || []) {
      if (!d.properties.periodo_de_deuda) deals.push(d);
    }
    after = data.paging?.next?.after;
  } while (after);
  console.log(`   Encontrados: ${deals.length} deals`);

  // ── 2. Batch associations deal → ticket ───────────────────────────────────
  console.log('2. Obteniendo tickets asociados...');
  const dealToTicket = {};   // dealId (string) → ticketId (string)

  for (let i = 0; i < deals.length; i += 100) {
    const chunk = deals.slice(i, i + 100);
    const data  = await post(fetch,
      'https://api.hubapi.com/crm/v4/associations/deals/tickets/batch/read',
      { inputs: chunk.map(d => ({ id: String(d.id) })) },
      headers
    );
    for (const r of data.results || []) {
      if (r.to && r.to.length > 0) {
        dealToTicket[String(r.from.id)] = String(r.to[0].toObjectId);
      }
    }
  }

  const ticketIds = [...new Set(Object.values(dealToTicket))];
  console.log(`   Deals con ticket: ${Object.keys(dealToTicket).length} | Tickets únicos: ${ticketIds.length}`);

  // ── 3. Batch read tickets → fecha de creación ─────────────────────────────
  console.log('3. Leyendo fechas de tickets...');
  const ticketFechas = {};   // ticketId (string) → fecha (string)

  for (let i = 0; i < ticketIds.length; i += 100) {
    const chunk = ticketIds.slice(i, i + 100);
    const data  = await post(fetch,
      'https://api.hubapi.com/crm/v3/objects/tickets/batch/read',
      { inputs: chunk.map(id => ({ id })), properties: ['hs_createdate'] },
      headers
    );
    for (const t of data.results || []) {
      ticketFechas[String(t.id)] = t.properties.hs_createdate;
    }
  }
  console.log(`   Fechas obtenidas: ${Object.keys(ticketFechas).length}`);

  // ── 4. Construir updates ──────────────────────────────────────────────────
  console.log('4. Construyendo actualizaciones...');
  const updates  = [];
  let desdeDeal  = 0;
  let desdeTicket = 0;

  for (const d of deals) {
    const ticketId = dealToTicket[String(d.id)];
    const fecha    = (ticketId && ticketFechas[ticketId])
      ? ticketFechas[ticketId]
      : d.properties.hs_createdate;

    if (ticketId && ticketFechas[ticketId]) desdeTicket++; else desdeDeal++;

    updates.push({ id: d.id, properties: { periodo_de_deuda: fechaAPeriodo(fecha) } });
  }
  console.log(`   Desde ticket: ${desdeTicket} | Fallback (deal): ${desdeDeal}`);

  // ── 5. Batch update deals ─────────────────────────────────────────────────
  console.log('5. Actualizando deals...');
  let actualizados = 0;
  for (let i = 0; i < updates.length; i += 100) {
    const chunk = updates.slice(i, i + 100);
    await post(fetch, 'https://api.hubapi.com/crm/v3/objects/deals/batch/update',
      { inputs: chunk }, headers);
    actualizados += chunk.length;
    process.stdout.write(`\r   Actualizados: ${actualizados} / ${updates.length}`);
  }
  console.log('');

  // ── Resumen ───────────────────────────────────────────────────────────────
  const dist = {};
  for (const u of updates) {
    const p = u.properties.periodo_de_deuda;
    dist[p] = (dist[p] || 0) + 1;
  }
  console.log('\nDistribución final:');
  Object.keys(dist).sort().forEach(k => console.log(`  ${k}: ${dist[k]}`));
}

main().catch(e => { console.error(e); process.exit(1); });
