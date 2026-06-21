// snapshot_cartera.js
// Crea un Deal en el pipeline "Métricas de Cartera" con el conteo de inmobiliarias por estado.
// Ejecutar manualmente o programar con Task Scheduler todos los lunes a las 8:00 AM.

require('dotenv').config({ path: '../.env' });

const TOKEN       = process.env.HUBSPOT_TOKEN;
const PIPELINE_ID = '3765616829';
const STAGE_ID    = '5255294144';
const ESTADOS     = ['NUEVA', 'ACTIVA', 'PASIVA', 'INACTIVA', 'PERDIDA'];
const API_BASE    = 'https://api.hubapi.com';

async function contarEmpresas(estado) {
  const res = await fetch(`${API_BASE}/crm/v3/objects/companies/search`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'estado_de_actividad', operator: 'EQ', value: estado }] }],
      limit: 1,
      properties: ['estado_de_actividad']
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Error contando ${estado}: ${JSON.stringify(data)}`);
  return data.total || 0;
}

async function crearSnapshot() {
  const hoy     = new Date();
  const fechaStr = hoy.toISOString().slice(0, 10);
  const fechaMs  = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());

  console.log(`\n📸 Snapshot de Cartera — ${fechaStr}\n`);

  const totales = {};
  for (const estado of ESTADOS) {
    totales[estado] = await contarEmpresas(estado);
    console.log(`  ${estado.padEnd(10)}: ${totales[estado]}`);
  }

  const total = Object.values(totales).reduce((a, b) => a + b, 0);
  console.log(`  ${'TOTAL'.padEnd(10)}: ${total}\n`);

  const res = await fetch(`${API_BASE}/crm/v3/objects/deals`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        dealname:               `Snapshot Cartera — ${fechaStr}`,
        pipeline:               PIPELINE_ID,
        dealstage:              STAGE_ID,
        closedate:              fechaMs.toString(),
        amount:                 '0',
        snapshot_fecha:    fechaMs.toString(),
        snapshot_nueva:    totales['NUEVA'].toString(),
        snapshot_activa:   totales['ACTIVA'].toString(),
        snapshot_pasiva:   totales['PASIVA'].toString(),
        snapshot_inactiva: totales['INACTIVA'].toString(),
        snapshot_perdida:  totales['PERDIDA'].toString()
      }
    })
  });

  const deal = await res.json();
  if (deal.id) {
    console.log(`✅ Deal creado correctamente (ID: ${deal.id})`);
    console.log(`   Nombre: Snapshot Cartera — ${fechaStr}`);
  } else {
    console.error('❌ Error al crear el Deal:', JSON.stringify(deal, null, 2));
    process.exit(1);
  }
}

crearSnapshot().catch(err => {
  console.error('❌ Error inesperado:', err.message);
  process.exit(1);
});
