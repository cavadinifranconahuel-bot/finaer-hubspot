const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();
const API = 'https://api.hubapi.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const registros = [
  { dni: '30715463462', expediente: '8715' },
  { dni: '27808618',    expediente: '10750' },
  { dni: '36162182',    expediente: '12457' },
  { dni: '43782848',    expediente: '11728' },
  { dni: '10520361',    expediente: '9496' },
  { dni: '13406209',    expediente: '11816' },
  { dni: '31763516',    expediente: '12215' },
  { dni: '14584383',    expediente: '12793' },
  { dni: '40946837',    expediente: '10158' },
  { dni: '22550255',    expediente: '12735' },
  { dni: '95480865',    expediente: '12193' },
  { dni: '20640555',    expediente: '9689' },
  { dni: '40621729',    expediente: '9473' },
  { dni: '95762731',    expediente: '13699' },
];

async function buscarTicket(dni) {
  const r = await fetch(`${API}/crm/v3/objects/tickets/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'dni_inquilino', operator: 'EQ', value: dni }, { propertyName: 'hs_pipeline', operator: 'EQ', value: '3353793749' }] }],
      properties: ['subject', 'dni_inquilino'],
      sorts: [{ propertyName: 'hs_object_id', direction: 'ASCENDING' }],
      limit: 1
    })
  });
  const d = await r.json();
  return d.results?.[0] || null;
}

async function actualizarTicket(id, expediente) {
  await fetch(`${API}/crm/v3/objects/tickets/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { nro_expediente: expediente, hubspot_owner_id: '29822625' } })
  });
}

async function main() {
  let ok = 0, noEncontrado = 0;
  for (const { dni, expediente } of registros) {
    const ticket = await buscarTicket(dni);
    if (!ticket) {
      console.log(`❌ DNI ${dni} — no encontrado`);
      noEncontrado++;
    } else {
      await actualizarTicket(ticket.id, expediente);
      console.log(`✅ DNI ${dni} — Exp ${expediente} — ${ticket.properties.subject}`);
      ok++;
    }
    await sleep(150);
  }
  console.log(`\n${ok} actualizados | ${noEncontrado} no encontrados`);
}

main().catch(console.error);
