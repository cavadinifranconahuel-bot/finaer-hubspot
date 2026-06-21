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

async function patch(ticketId, props) {
  await fetch(`${API}/crm/v3/objects/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: props })
  });
}

async function asociar(retroactivoId, padreId) {
  await fetch(`${API}/crm/v4/objects/tickets/${retroactivoId}/associations/tickets/${padreId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 452 }])
  });
}

async function main() {
  console.log('Cargando tickets del pipeline de incumplimientos...\n');

  let offset = 0;
  const todos = [];

  while (true) {
    const search = await post('/crm/v3/objects/tickets/search', {
      filterGroups: [{
        filters: [
          { propertyName: 'hs_pipeline', operator: 'EQ', value: '3353793749' },
          { propertyName: 'dni_inquilino', operator: 'HAS_PROPERTY' },
          { propertyName: 'nro_expediente', operator: 'HAS_PROPERTY' }
        ]
      }],
      properties: ['dni_inquilino', 'nro_expediente', 'es_ticket_retroactivo', 'tiene_tickets_retroactivos'],
      sorts: [{ propertyName: 'hs_object_id', direction: 'ASCENDING' }],
      limit: 200,
      after: offset || undefined
    });

    if (!search.results?.length) break;
    todos.push(...search.results);
    process.stdout.write(`\r  Cargados: ${todos.length}...`);
    if (!search.paging?.next?.after) break;
    offset = search.paging.next.after;
    await sleep(150);
  }

  console.log(`\n\nTotal tickets con DNI + expediente: ${todos.length}`);
  console.log('Agrupando por DNI + expediente...\n');

  // Agrupar por DNI + expediente
  const grupos = {};
  for (const t of todos) {
    const key = `${t.properties.dni_inquilino}__${t.properties.nro_expediente}`;
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(t);
  }

  const gruposConDuplicados = Object.values(grupos).filter(g => g.length > 1);
  console.log(`Grupos con más de 1 ticket: ${gruposConDuplicados.length}`);
  console.log(`Tickets a procesar como retroactivos: ${gruposConDuplicados.reduce((a, g) => a + g.length - 1, 0)}\n`);

  let procesados = 0, errores = 0;

  for (const grupo of gruposConDuplicados) {
    // El de menor ID es el padre (más antiguo)
    const padre = grupo[0]; // ya vienen ordenados por hs_object_id ASC
    const retroactivos = grupo.slice(1);

    try {
      // Marcar padre
      if (!padre.properties.tiene_tickets_retroactivos) {
        await patch(padre.id, { tiene_tickets_retroactivos: 'true' });
      }

      // Marcar retroactivos
      for (const retro of retroactivos) {
        if (!retro.properties.es_ticket_retroactivo) {
          await patch(retro.id, {
            es_ticket_retroactivo: 'true',
            id_ticket_padre: padre.id
          });
        }
        // Crear asociación
        await asociar(retro.id, padre.id);
        procesados++;
        process.stdout.write(`\r  Procesados: ${procesados}...`);
        await sleep(80);
      }
    } catch(e) {
      errores++;
    }
  }

  console.log(`\n\n✅ Retroactivos procesados: ${procesados}`);
  console.log(`❌ Errores: ${errores}`);
}

main().catch(console.error);
