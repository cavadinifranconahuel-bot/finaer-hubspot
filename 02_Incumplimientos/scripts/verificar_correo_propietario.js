const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();
const API = 'https://api.hubapi.com';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function post(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function main() {
  let offset = 0;
  const todos = [];

  while (true) {
    const search = await post('/crm/v3/objects/tickets/search', {
      filterGroups: [{
        filters: [
          { propertyName: 'hs_pipeline', operator: 'EQ', value: '3353793749' },
          { propertyName: 'hs_pipeline_stage', operator: 'EQ', value: '4596051185' },
          { propertyName: 'fecha_negociacion', operator: 'EQ', value: '1780012800000' }
        ]
      }],
      properties: ['dni_inquilino', 'correo_del_propietario', 'subject'],
      limit: 100,
      after: offset || undefined
    });

    todos.push(...(search.results || []));
    if (!search.paging?.next?.after) break;
    offset = search.paging.next.after;
  }

  console.log(`Analizando ${todos.length} tickets...\n`);

  let ok = 0, coincidencia = 0, sinDni = 0;

  for (const ticket of todos) {
    const dni = ticket.properties.dni_inquilino;
    const correoPopulado = ticket.properties.correo_del_propietario;

    if (!correoPopulado || !dni) { sinDni++; continue; }

    // Buscar el contacto inquilino por DNI
    const search = await post('/crm/v3/objects/contacts/search', {
      filterGroups: [{ filters: [{ propertyName: 'nro_documento_txt', operator: 'EQ', value: String(parseInt(dni)) }] }],
      properties: ['email'],
      limit: 1
    });

    const emailInquilino = search.results?.[0]?.properties?.email;

    if (emailInquilino && emailInquilino.toLowerCase() === correoPopulado.toLowerCase()) {
      coincidencia++;
      console.log(`⚠️  COINCIDENCIA — ${ticket.properties.subject}`);
      console.log(`   correo_propietario: ${correoPopulado}`);
      console.log(`   email_inquilino:    ${emailInquilino}\n`);
    } else {
      ok++;
    }

    await sleep(80);
  }

  console.log(`\n✅ Correctos: ${ok}`);
  console.log(`⚠️  Coincidencias (posible error): ${coincidencia}`);
  console.log(`➖ Sin datos suficientes: ${sinDni}`);
}

main().catch(console.error);
