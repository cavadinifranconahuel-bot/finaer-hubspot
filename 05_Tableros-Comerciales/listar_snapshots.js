require('dotenv').config({ path: '../.env' });

const TOKEN = process.env.HUBSPOT_TOKEN;
const PIPELINE_ID = '3765616829';

async function main() {
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'pipeline', operator: 'EQ', value: PIPELINE_ID }] }],
      sorts: [{ propertyName: 'snapshot_fecha', direction: 'ASCENDING' }],
      properties: ['dealname', 'snapshot_fecha', 'snapshot_nueva', 'snapshot_activa', 'snapshot_pasiva', 'snapshot_inactiva', 'snapshot_perdida', 'hs_createdate'],
      limit: 100
    })
  });
  const data = await res.json();
  if (!data.results) { console.error(JSON.stringify(data, null, 2)); return; }

  for (const d of data.results) {
    const p = d.properties;
    console.log(`ID ${d.id} | ${p.dealname} | snapshot_fecha=${p.snapshot_fecha} | createdate=${p.hs_createdate} | N=${p.snapshot_nueva} A=${p.snapshot_activa} P=${p.snapshot_pasiva} I=${p.snapshot_inactiva} PE=${p.snapshot_perdida}`);
  }
}

main().catch(e => console.error(e.message));
