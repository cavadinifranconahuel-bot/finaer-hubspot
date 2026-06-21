const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();
const API = 'https://api.hubapi.com';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function post(path, body) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return r.json();
    } catch(e) { await sleep(2000); }
  }
}

async function main() {
  console.log('Buscando tickets NO retroactivos en el pipeline de incumplimientos...\n');

  let offset = 0;
  const todos = [];

  while (true) {
    const search = await post('/crm/v3/objects/tickets/search', {
      filterGroups: [{
        filters: [
          { propertyName: 'hs_pipeline', operator: 'EQ', value: '3353793749' },
          { propertyName: 'es_ticket_retroactivo', operator: 'NOT_HAS_PROPERTY' },
          { propertyName: 'createdate', operator: 'GTE', value: '1778803200000' }
        ]
      },{
        filters: [
          { propertyName: 'hs_pipeline', operator: 'EQ', value: '3353793749' },
          { propertyName: 'es_ticket_retroactivo', operator: 'EQ', value: 'false' },
          { propertyName: 'createdate', operator: 'GTE', value: '1778803200000' }
        ]
      }],
      properties: ['dni_inquilino', 'subject', 'hs_pipeline_stage', 'createdate', 'nro_expediente'],
      sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
      limit: 200,
      after: offset || undefined
    });

    if (!search.results?.length) break;
    todos.push(...search.results);
    process.stdout.write(`\r  Cargados: ${todos.length}...`);
    if (!search.paging?.next?.after) break;
    offset = search.paging.next.after;
    await sleep(200);
  }

  console.log(`\n\nTotal tickets no retroactivos: ${todos.length}`);
  console.log('Analizando duplicados por DNI...\n');

  // Agrupar por DNI
  const porDni = {};
  for (const t of todos) {
    const dni = t.properties.dni_inquilino;
    if (!dni) continue;
    if (!porDni[dni]) porDni[dni] = [];
    porDni[dni].push(t);
  }

  // Filtrar los que tienen más de uno
  const duplicados = Object.entries(porDni).filter(([, tickets]) => tickets.length > 1);

  if (!duplicados.length) {
    console.log('No se encontraron tickets duplicados.');
    return;
  }

  console.log(`Se encontraron ${duplicados.length} DNIs con más de un ticket:\n`);
  console.log('='.repeat(80));

  for (const [dni, tickets] of duplicados.sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\nDNI: ${dni} — ${tickets.length} tickets`);
    for (const t of tickets) {
      const fecha = t.properties.createdate?.slice(0, 10) || 'sin fecha';
      const exp = t.properties.nro_expediente || 'sin exp';
      console.log(`  • [${fecha}] Exp: ${exp} | ${t.properties.subject} (ID: ${t.id})`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\nResumen: ${duplicados.length} DNIs duplicados | ${duplicados.reduce((acc, [, t]) => acc + t.length, 0)} tickets involucrados`);
}

main().catch(console.error);
