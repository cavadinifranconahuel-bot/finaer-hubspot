// analizar_periodos_por_fecha.js
// Analiza distribución por fecha de creación de deals sin periodo_de_deuda
// node analizar_periodos_por_fecha.js

const TOKEN = process.env.HUBSPOT_TOKEN;

async function main() {
  const fetch = (await import('node-fetch')).default;
  const headers = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  const distribucion = {};
  let total = 0;
  let after = undefined;

  do {
    const body = {
      filterGroups: [{ filters: [{ propertyName: 'pipeline', operator: 'EQ', value: '3403406575' }] }],
      properties: ['hs_createdate', 'periodo_de_deuda'],
      limit: 100,
      ...(after ? { after } : {})
    };

    const res  = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
      method: 'POST', headers, body: JSON.stringify(body)
    });
    const data = await res.json();

    for (const d of data.results) {
      if (!d.properties.periodo_de_deuda) {
        total++;
        const fecha = new Date(d.properties.hs_createdate);
        const key   = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        distribucion[key] = (distribucion[key] || 0) + 1;
      }
    }

    after = data.paging?.next?.after;
  } while (after);

  console.log(`Deals sin periodo_de_deuda: ${total}`);
  console.log('\nDistribución por mes de creación:');
  Object.keys(distribucion).sort().forEach(k => {
    console.log(`  ${k} : ${distribucion[k]} deals`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
