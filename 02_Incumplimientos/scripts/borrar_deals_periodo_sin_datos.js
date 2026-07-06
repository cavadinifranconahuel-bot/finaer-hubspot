// borrar_deals_periodo_sin_datos.js
// Borra deals del pipeline de período (3403406575) que no tienen ningún monto de deuda
// node borrar_deals_periodo_sin_datos.js

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const PROPS = ['monto_total_de_la_deuda_acumulada','alquiler','luz','gas','abl','deuda_expensas','deuda_aysa','deuda_por_entrega_de_llaves'];

async function main() {
  const fetch = (await import('node-fetch')).default;
  const headers = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  // 1. Buscar todos los deals del pipeline de período
  const aBorrar = [];
  let after = undefined;

  do {
    const body = {
      filterGroups: [{ filters: [{ propertyName: 'pipeline', operator: 'EQ', value: '3403406575' }] }],
      properties: PROPS,
      limit: 100,
      ...(after ? { after } : {})
    };

    const res  = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
      method: 'POST', headers, body: JSON.stringify(body)
    });
    const data = await res.json();

    for (const d of data.results) {
      const suma = PROPS.reduce((acc, p) => acc + parseFloat(d.properties[p] || 0), 0);
      if (suma === 0) aBorrar.push({ id: d.id });
    }

    after = data.paging?.next?.after;
  } while (after);

  console.log(`Encontrados: ${aBorrar.length} deals a borrar`);

  // 2. Borrar en bloques de 100
  let borrados = 0;
  for (let i = 0; i < aBorrar.length; i += 100) {
    const chunk = aBorrar.slice(i, i + 100);
    const res   = await fetch('https://api.hubapi.com/crm/v3/objects/deals/batch/archive', {
      method: 'POST', headers, body: JSON.stringify({ inputs: chunk })
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('Error en bloque:', JSON.stringify(err));
    }
    borrados += chunk.length;
    console.log(`  Borrados: ${borrados} / ${aBorrar.length}`);
  }

  console.log('Listo.');
}

main().catch(e => { console.error(e); process.exit(1); });
