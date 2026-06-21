const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();
const API = 'https://api.hubapi.com';

const OWNERS = {
  'florencia velasco': '29822625',
  'debora romero': '29822627'
};
const ETAPA_EN_GESTION = '4596051184';
const ETAPA_NUEVO = '4596051183';

// Registros nuevos (excluye los 25 ya procesados de Florencia y el CUIL pendiente)
const registros = [
  // Florencia Velasco - nuevos
  { dni: '20023127', expediente: '10251', owner: 'florencia velasco' },
  { dni: '39775336', expediente: '13284', owner: 'florencia velasco' },
  { dni: '39927047', expediente: '13029', owner: 'florencia velasco' },
  { dni: '35107342', expediente: '12163', owner: 'florencia velasco' },
  { dni: '95960531', expediente: null,    owner: 'florencia velasco', etapa: ETAPA_NUEVO },
  { dni: '96088437', expediente: '13271', owner: 'florencia velasco' },
  // Débora Romero
  { dni: '42739039', expediente: '13175', owner: 'debora romero' },
  { dni: '11644389', expediente: '11605', owner: 'debora romero' },
  { dni: '96089578', expediente: '10170', owner: 'debora romero' },
  { dni: '23183636', expediente: '12658', owner: 'debora romero' },
  { dni: '32023223', expediente: '10797', owner: 'debora romero' },
  { dni: '28083318', expediente: '11310', owner: 'debora romero' },
  { dni: '95754282', expediente: '10636', owner: 'debora romero' },
  { dni: '45004503', expediente: '12122', owner: 'debora romero' },
  { dni: '38044455', expediente: '12061', owner: 'debora romero' },
  { dni: '16380456', expediente: '12825', owner: 'debora romero' },
  { dni: '24155800', expediente: '11100', owner: 'debora romero' },
  { dni: '24657927', expediente: '11745', owner: 'debora romero' },
  { dni: '26293623', expediente: '12495', owner: 'debora romero' },
  { dni: '30369101', expediente: '12684', owner: 'debora romero' },
  { dni: '44042762', expediente: '12414', owner: 'debora romero' },
  { dni: '24030184', expediente: '13140', owner: 'debora romero' },
  { dni: '33961391', expediente: '12960', owner: 'debora romero' },
  { dni: '35230831', expediente: '10908', owner: 'debora romero' },
  { dni: '34999103', expediente: '10149', owner: 'debora romero' },
  { dni: '26421310', expediente: '12406', owner: 'debora romero' },
  { dni: '37098663', expediente: '12794', owner: 'debora romero' },
  { dni: '36646083', expediente: '8923',  owner: 'debora romero' },
  { dni: '34952557', expediente: '10975', owner: 'debora romero' },
  { dni: '40241561', expediente: '13163', owner: 'debora romero' },
  { dni: '25631778', expediente: '9901',  owner: 'debora romero' },
  { dni: '40422770', expediente: '10280', owner: 'debora romero' },
  { dni: '93250305', expediente: '10873', owner: 'debora romero' },
  { dni: '22608770', expediente: '13396', owner: 'debora romero' },
  { dni: '21925634', expediente: '9967',  owner: 'debora romero' },
  { dni: '29191673', expediente: '11713', owner: 'debora romero' },
  { dni: '40141902', expediente: '13193', owner: 'debora romero' },
  { dni: '40536093', expediente: '11268', owner: 'debora romero' },
  { dni: '26934259', expediente: '12933', owner: 'debora romero' },
  { dni: '95808227', expediente: '12405', owner: 'debora romero' },
  { dni: '35227276', expediente: '11599', owner: 'debora romero' },
];

// Tickets ya procesados de Florencia → solo cambiar etapa a En gestión
const ticketsYaProcesados = [
  '418314439878','418211277003','418339696887','414177631432','418305528050',
  '416106564826','418207966413','418300138737','418468448473','418540590295',
  '418321739966','418218478825','410091726032','418354028783','418231122143',
  '418323470574','418540593346','418545995965','418207970547','418482905304',
  '418522801358','418354031819','418320282840','418274128069','418318473423'
];

async function buscarTicket(dni) {
  const res = await fetch(`${API}/crm/v3/objects/tickets/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'dni_inquilino', operator: 'EQ', value: dni }] }],
      properties: ['dni_inquilino', 'hs_pipeline_stage'],
      limit: 1
    })
  });
  const data = await res.json();
  return data.results?.[0] || null;
}

async function actualizarTicket(ticketId, props) {
  const res = await fetch(`${API}/crm/v3/objects/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: props })
  });
  return res.ok;
}

async function main() {
  let ok = 0, noEncontrado = 0, error = 0;

  console.log(`\n── Procesando ${registros.length} registros nuevos ──\n`);

  for (const { dni, expediente, owner, etapa } of registros) {
    const ticket = await buscarTicket(dni);
    if (!ticket) {
      console.log(`❌ DNI ${dni} — Ticket NO encontrado`);
      noEncontrado++; continue;
    }

    const props = {
      hubspot_owner_id: OWNERS[owner],
      hs_pipeline_stage: etapa || ETAPA_EN_GESTION
    };
    if (expediente) props.nro_expediente = expediente;

    const actualizado = await actualizarTicket(ticket.id, props);
    if (actualizado) {
      console.log(`✅ DNI ${dni} — Exp ${expediente || 'sin exp'} — Ticket ${ticket.id} → ${owner} / etapa ${etapa ? 'NUEVO' : 'En gestión'}`);
      ok++;
    } else {
      console.log(`⚠️  DNI ${dni} — Ticket ${ticket.id} — ERROR`);
      error++;
    }
  }

  console.log(`\n── Pasando ${ticketsYaProcesados.length} tickets anteriores a En gestión ──\n`);

  for (const ticketId of ticketsYaProcesados) {
    const actualizado = await actualizarTicket(ticketId, { hs_pipeline_stage: ETAPA_EN_GESTION });
    if (actualizado) {
      console.log(`✅ Ticket ${ticketId} → En gestión`);
      ok++;
    } else {
      console.log(`⚠️  Ticket ${ticketId} → ERROR`);
      error++;
    }
  }

  console.log(`\nResumen: ${ok} actualizados | ${noEncontrado} no encontrados | ${error} con error`);
}

main().catch(console.error);
