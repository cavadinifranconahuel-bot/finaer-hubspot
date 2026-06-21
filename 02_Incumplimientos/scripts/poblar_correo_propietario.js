const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();
const API = 'https://api.hubapi.com';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const LABELS_EXCLUIR = [33, 35, 43]; // Inquilino, Cogarante, Solicitante
const LABELS_PREFERIR = [31, 41];    // Propietario, Vendedor Inmobiliaria

async function post(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function patch(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function getAsocContactos(ticketId) {
  const r = await fetch(`${API}/crm/v4/objects/tickets/${ticketId}/associations/contacts`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  return (await r.json()).results || [];
}

async function main() {
  console.log('Reprocesando 199 tickets con logica corregida por labels...\n');

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

  console.log(`Total: ${todos.length} tickets\n`);

  let ok = 0, sinEmail = 0, cambios = 0;

  for (const ticket of todos) {
    const ticketId = ticket.id;

    // Obtener asociaciones con labels
    const asocs = await getAsocContactos(ticketId);
    if (!asocs.length) { sinEmail++; continue; }

    const labelsPorContacto = {};
    for (const a of asocs) {
      const typeIds = (a.associationTypes || []).filter(t => t.category === 'USER_DEFINED').map(t => t.typeId);
      labelsPorContacto[String(a.toObjectId)] = typeIds;
    }

    const contactIds = [...new Set(asocs.map(a => String(a.toObjectId)))];

    const contactsData = await post('/crm/v3/objects/contacts/batch/read', {
      inputs: contactIds.map(id => ({ id })),
      properties: ['email']
    });

    const conEmail = (contactsData.results || []).filter(c => c.properties.email);

    // 1. Preferir Propietario (31) o Vendedor Inmobiliaria (41)
    let emailNuevo = conEmail.find(c => {
      const labels = labelsPorContacto[String(c.id)] || [];
      return labels.some(l => LABELS_PREFERIR.includes(l));
    })?.properties.email;

    // 2. Si no hay, tomar el que NO tenga labels de Inquilino/Cogarante/Solicitante
    if (!emailNuevo) {
      emailNuevo = conEmail.find(c => {
        const labels = labelsPorContacto[String(c.id)] || [];
        return !labels.some(l => LABELS_EXCLUIR.includes(l));
      })?.properties.email;
    }

    if (!emailNuevo) { sinEmail++; continue; }

    const emailAnterior = ticket.properties.correo_del_propietario;
    await patch(`/crm/v3/objects/tickets/${ticketId}`, {
      properties: { correo_del_propietario: emailNuevo }
    });

    if (emailAnterior !== emailNuevo) {
      cambios++;
      console.log(`🔄 ${ticket.properties.subject}`);
      console.log(`   Antes: ${emailAnterior || '(vacío)'}`);
      console.log(`   Ahora: ${emailNuevo}\n`);
    }

    ok++;
    await sleep(100);
  }

  console.log(`\nResumen: ${ok} procesados | ${cambios} corregidos | ${sinEmail} sin email`);
}

main().catch(console.error);
