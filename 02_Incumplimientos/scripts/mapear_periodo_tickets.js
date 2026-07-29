// mapear_periodo_tickets.js
// Pobla periodo_de_deuda en tickets del pipeline de incumplimientos
// usando el mes de creación del ticket.
// node mapear_periodo_tickets.js

const TOKEN = process.env.HUBSPOT_TOKEN;
const PIPELINE = '3353793749';

const MESES = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo',     4: 'Abril',
  5: 'Mayo',  6: 'Junio',   7: 'Julio',     8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};

const OPCIONES_VALIDAS = new Set([
  'Enero - 2026','Febrero - 2026','Marzo - 2026','Abril - 2026',
  'Mayo - 2026','Junio - 2026','Julio - 2026','Agosto - 2026',
  'Septiembre - 2026','Octubre - 2026','Noviembre - 2026','Diciembre - 2026'
]);

function fechaAPeriodo(fechaStr) {
  const d = new Date(fechaStr);
  return `${MESES[d.getMonth() + 1]} - ${d.getFullYear()}`;
}

async function main() {
  const fetch = (await import('node-fetch')).default;
  const headers = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  // 1. Buscar tickets sin periodo_de_deuda
  console.log('1. Buscando tickets sin periodo_de_deuda...');
  const tickets = [];
  let after = undefined;
  do {
    const res  = await fetch('https://api.hubapi.com/crm/v3/objects/tickets/search', {
      method: 'POST', headers,
      body: JSON.stringify({
        filterGroups: [{
          filters: [
            { propertyName: 'hs_pipeline',      operator: 'EQ',           value: PIPELINE },
            { propertyName: 'periodo_de_deuda', operator: 'NOT_HAS_PROPERTY' }
          ]
        }],
        properties: ['createdate', 'periodo_de_deuda'],
        limit: 100,
        ...(after ? { after } : {})
      })
    });
    const data = await res.json();
    for (const t of data.results || []) tickets.push(t);
    after = data.paging?.next?.after;
  } while (after);
  console.log(`   Encontrados: ${tickets.length} tickets`);

  // 2. Construir updates
  const updates  = [];
  const skipped  = [];

  for (const t of tickets) {
    const periodo = fechaAPeriodo(t.properties.createdate);
    if (OPCIONES_VALIDAS.has(periodo)) {
      updates.push({ id: t.id, properties: { periodo_de_deuda: periodo } });
    } else {
      skipped.push({ id: t.id, fecha: t.properties.hs_createdate, periodo });
    }
  }

  console.log(`\n   A actualizar: ${updates.length} | Skipped (fuera de opciones): ${skipped.length}`);
  if (skipped.length > 0) {
    console.log('   Tickets skipped:');
    skipped.forEach(s => console.log(`     ID ${s.id} → ${s.periodo} (${s.fecha.slice(0,10)})`));
  }

  if (updates.length === 0) {
    console.log('\nNada que actualizar.');
    return;
  }

  // 3. Batch update
  console.log('\n2. Actualizando tickets...');
  let actualizados = 0;
  for (let i = 0; i < updates.length; i += 100) {
    const chunk = updates.slice(i, i + 100);
    const res   = await fetch('https://api.hubapi.com/crm/v3/objects/tickets/batch/update', {
      method: 'POST', headers,
      body: JSON.stringify({ inputs: chunk })
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('Error en bloque:', JSON.stringify(err).slice(0, 300));
    }
    actualizados += chunk.length;
    process.stdout.write(`\r   Actualizados: ${actualizados} / ${updates.length}`);
  }
  console.log('');

  // Distribución final
  const dist = {};
  for (const u of updates) {
    const p = u.properties.periodo_de_deuda;
    dist[p] = (dist[p] || 0) + 1;
  }
  console.log('\nDistribución:');
  Object.keys(dist).sort().forEach(k => console.log(`  ${k}: ${dist[k]}`));
  console.log('\nListo.');
}

main().catch(e => { console.error(e); process.exit(1); });
