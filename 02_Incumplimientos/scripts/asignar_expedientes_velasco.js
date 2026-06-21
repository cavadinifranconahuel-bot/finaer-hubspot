const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();
const API = 'https://api.hubapi.com';
const OWNER_ID = '29822625'; // Florencia Velasco

const registros = [
  { dni: '27214637', expediente: '11438' },
  { dni: '24610663', expediente: '10698' },
  { dni: '29715396', expediente: '10111' },
  { dni: '34782239', expediente: '10452' },
  { dni: '96079590', expediente: '11623' },
  { dni: '34613739', expediente: '11309' },
  { dni: '38940874', expediente: '12989' },
  { dni: '34736710', expediente: '12030' },
  { dni: '43993445', expediente: '10308' },
  { dni: '28943283', expediente: '11544' },
  { dni: '28983477', expediente: '10127' },
  { dni: '18633489', expediente: '12501' },
  { dni: '33031935', expediente: '12882' },
  { dni: '27503683', expediente: '12982' },
  { dni: '27703587', expediente: '10192' },
  { dni: '33620540', expediente: '10203' },
  { dni: '25390401', expediente: '12700' },
  { dni: '35379448', expediente: '10822' },
  { dni: '5951303',  expediente: '12694' },
  { dni: '43869508', expediente: '12589' },
  { dni: '95080402', expediente: '11608' },
  { dni: '24476831', expediente: '7492'  },
  { dni: '40621729', expediente: '9473'  },
  { dni: '95533209', expediente: '9628'  },
  { dni: '40623643', expediente: '11439' },
];

async function buscarTicket(dni) {
  const res = await fetch(`${API}/crm/v3/objects/tickets/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'dni_inquilino', operator: 'EQ', value: dni }] }],
      properties: ['dni_inquilino', 'subject', 'nro_expediente', 'hubspot_owner_id'],
      limit: 1
    })
  });
  const data = await res.json();
  return data.results?.[0] || null;
}

async function actualizarTicket(ticketId, expediente) {
  const res = await fetch(`${API}/crm/v3/objects/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        nro_expediente: expediente,
        hubspot_owner_id: OWNER_ID
      }
    })
  });
  return res.ok;
}

async function main() {
  console.log(`Procesando ${registros.length} registros...\n`);
  let ok = 0, noEncontrado = 0, error = 0;

  for (const { dni, expediente } of registros) {
    const ticket = await buscarTicket(dni);
    if (!ticket) {
      console.log(`❌ DNI ${dni} — Expediente ${expediente} — Ticket NO encontrado`);
      noEncontrado++;
      continue;
    }
    const actualizado = await actualizarTicket(ticket.id, expediente);
    if (actualizado) {
      console.log(`✅ DNI ${dni} — Expediente ${expediente} — Ticket ${ticket.id} actualizado`);
      ok++;
    } else {
      console.log(`⚠️  DNI ${dni} — Expediente ${expediente} — Ticket ${ticket.id} ERROR al actualizar`);
      error++;
    }
  }

  console.log(`\nResumen: ${ok} actualizados | ${noEncontrado} no encontrados | ${error} con error`);
}

main().catch(console.error);
