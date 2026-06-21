const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();
const API = 'https://api.hubapi.com';

async function get(path) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  return r.json();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function post(path, body, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return r.json();
    } catch (e) {
      if (i < retries - 1) { await sleep(2000); continue; }
      throw e;
    }
  }
}

async function del(path, body) {
  await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function getAsociaciones(ticketId) {
  const r = await post('/crm/v4/associations/tickets/tickets/batch/read', { inputs: [{ id: ticketId }] });
  return r.results?.[0]?.to || [];
}

async function main() {
  console.log('Buscando tickets con ambos labels (TICKET HIJO + TICKET PADRE)...\n');

  let offset = 0;
  let total = 0;
  let corregidos = 0;
  let errores = 0;

  // Buscar todos los tickets del pipeline de incumplimientos con expediente y DNI
  while (true) {
    const search = await post('/crm/v3/objects/tickets/search', {
      filterGroups: [{
        filters: [
          { propertyName: 'hs_pipeline', operator: 'EQ', value: '3353793749' },
          { propertyName: 'nro_expediente', operator: 'HAS_PROPERTY' },
          { propertyName: 'dni_inquilino', operator: 'HAS_PROPERTY' }
        ]
      }],
      properties: ['nro_expediente', 'dni_inquilino'],
      limit: 100,
      after: offset || undefined
    });

    if (!search.results?.length) break;
    total += search.results.length;

    for (const ticket of search.results) {
      const asoc = await getAsociaciones(ticket.id);

      const tieneHijo = asoc.some(t => t.associationTypes?.some(a => a.category === 'USER_DEFINED' && a.typeId === 46));
      const tienePadre = asoc.some(t => t.associationTypes?.some(a => a.category === 'USER_DEFINED' && a.typeId === 45));

      // Solo procesar tickets que tienen AMBOS labels — eso es el error
      if (!tieneHijo || !tienePadre) continue;

      // Encontrar cuál es el ticket padre real (ID más bajo entre los asociados + el propio)
      const asociadosIds = asoc.map(t => String(t.toObjectId));
      const todosIds = [ticket.id, ...asociadosIds];
      const padreId = todosIds.sort((a, b) => Number(a) - Number(b))[0];
      const hijoIds = todosIds.filter(id => id !== padreId);

      console.log(`Ticket ${ticket.id} tiene ambos labels | Padre correcto: ${padreId} | Hijos: ${hijoIds.join(', ')}`);

      try {
        for (const hijoId of hijoIds) {
          // Limpiar asociaciones incorrectas
          await del(`/crm/v4/objects/tickets/${padreId}/associations/tickets/${hijoId}`, [{ associationCategory: 'USER_DEFINED', associationTypeId: 46 }]);
          await del(`/crm/v4/objects/tickets/${hijoId}/associations/tickets/${padreId}`, [{ associationCategory: 'USER_DEFINED', associationTypeId: 45 }]);

          // Crear asociaciones correctas
          await post('/crm/v4/associations/tickets/tickets/batch/create', {
            inputs: [{ from: { id: padreId }, to: { id: hijoId }, types: [{ associationCategory: 'USER_DEFINED', associationTypeId: 45 }] }]
          });
          await post('/crm/v4/associations/tickets/tickets/batch/create', {
            inputs: [{ from: { id: hijoId }, to: { id: padreId }, types: [{ associationCategory: 'USER_DEFINED', associationTypeId: 46 }] }]
          });

          console.log(`  ✅ Corregido: Padre ${padreId} <-> Hijo ${hijoId}`);
        }
        corregidos++;
      } catch (e) {
        console.log(`  ❌ Error en ticket ${ticket.id}: ${e.message}`);
        errores++;
      }
    }

    if (!search.paging?.next?.after) break;
    offset = search.paging.next.after;
  }

  console.log(`\nTotal revisados: ${total} | Corregidos: ${corregidos} | Errores: ${errores}`);
}

main().catch(console.error);
