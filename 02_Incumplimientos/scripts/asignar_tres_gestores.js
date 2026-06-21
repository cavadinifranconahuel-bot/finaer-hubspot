const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();
const API = 'https://api.hubapi.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const VELASCO  = '29822625';
const GALLARDO = '32624020';
const ROMERO   = '29822627';

// Florencia Velasco — buscar por DNI
const velasco = [
  { dni: '30715463462', exp: '8715' }, { dni: '27808618', exp: '10750' },
  { dni: '36162182',    exp: '12457' }, { dni: '43782848', exp: '11728' },
  { dni: '10520361',    exp: '9496'  }, { dni: '13406209', exp: '11816' },
  { dni: '31763516',    exp: '12215' }, { dni: '14584383', exp: '12793' },
  { dni: '40946837',    exp: '10158' }, { dni: '22550255', exp: '12735' },
  { dni: '95480865',    exp: '12193' }, { dni: '20640555', exp: '9689'  },
  { dni: '40621729',    exp: '9473'  }, { dni: '95762731', exp: '13699' },
];

// Débora Romero — buscar por expediente (lista de imagen)
const romeroPorExp = [
  '13612','10386','13575','13460','11131','13583','13603','12031','13149'
];

// Débora Romero — buscar por DNI
const romero = [
  { dni: '30600547', exp: '12551' }, { dni: '95944142', exp: '10172' },
  { dni: '35044370', exp: '11983' }, { dni: '28044376', exp: '12505' },
  { dni: '28266182', exp: '10439' }, { dni: '39464736', exp: '10320' },
  { dni: '24030184', exp: '13140' }, { dni: '37964426', exp: '10005' },
  { dni: '95542357', exp: '11073' }, { dni: '22587131', exp: '9907'  },
  { dni: '13196759', exp: '10670' }, { dni: '26934259', exp: '12933' },
  { dni: '37987321', exp: '11580' }, { dni: '17177016', exp: '10939' },
  { dni: '44042762', exp: '12414' },
];

async function buscarPorDni(dni) {
  const r = await fetch(`${API}/crm/v3/objects/tickets/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'dni_inquilino', operator: 'EQ', value: dni }, { propertyName: 'hs_pipeline', operator: 'EQ', value: '3353793749' }] }],
      properties: ['subject'], sorts: [{ propertyName: 'hs_object_id', direction: 'ASCENDING' }], limit: 1
    })
  });
  return (await r.json()).results?.[0] || null;
}

async function buscarPorExp(exp) {
  const r = await fetch(`${API}/crm/v3/objects/tickets/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'nro_expediente', operator: 'EQ', value: exp }, { propertyName: 'hs_pipeline', operator: 'EQ', value: '3353793749' }] }],
      properties: ['subject'], sorts: [{ propertyName: 'hs_object_id', direction: 'ASCENDING' }], limit: 1
    })
  });
  return (await r.json()).results?.[0] || null;
}

async function actualizar(id, exp, owner) {
  const props = { hubspot_owner_id: owner, hs_pipeline_stage: '4596051184' }; // En gestión
  if (exp) props.nro_expediente = exp;
  await fetch(`${API}/crm/v3/objects/tickets/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: props })
  });
}

async function procesar(lista, ownerName, ownerId, porDni = true) {
  console.log(`\n── ${ownerName} (${lista.length} registros) ──`);
  let ok = 0, nf = 0;
  for (const item of lista) {
    const dni = porDni ? item.dni : null;
    const exp = porDni ? item.exp : item;
    const ticket = porDni ? await buscarPorDni(dni) : await buscarPorExp(exp);
    if (!ticket) { console.log(`❌ ${porDni ? 'DNI '+dni : 'Exp '+exp} — no encontrado`); nf++; }
    else { await actualizar(ticket.id, porDni ? exp : null, ownerId); console.log(`✅ Exp ${exp} — ${ticket.properties.subject}`); ok++; }
    await sleep(120);
  }
  console.log(`   ${ok} OK | ${nf} no encontrados`);
}

async function main() {
  await procesar(velasco,      'Florencia Velasco',        VELASCO, true);
  await procesar(romeroPorExp, 'Débora Romero (por exp)',  ROMERO,  false);
  await procesar(romero,       'Débora Romero (por DNI)',  ROMERO,  true);
  console.log('\n✅ Listo.');
}

main().catch(console.error);
