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

async function buscarCompanyEnBase(nombre) {
  const r = await post('/crm/v3/objects/companies/search', {
    filterGroups: [{
      filters: [
        { propertyName: 'id_interno', operator: 'HAS_PROPERTY' },
        { propertyName: 'name', operator: 'CONTAINS_TOKEN', value: nombre.split(' ')[0] }
      ]
    }],
    properties: ['name', 'estado_de_actividad', 'hs_object_id'],
    limit: 3
  });
  return r.results || [];
}

async function getContactDeCompany(companyId) {
  const r = await fetch(`${API}/crm/v4/objects/companies/${companyId}/associations/contacts`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  const data = await r.json();
  if (!data.results?.length) return null;
  const contactId = String(data.results[0].toObjectId);
  const c = await post('/crm/v3/objects/contacts/batch/read', {
    inputs: [{ id: contactId }],
    properties: ['email', 'firstname', 'lastname', 'createdate']
  });
  const contact = c.results?.[0];
  if (!contact) return null;
  return { id: contactId, ...contact.properties };
}

async function crearLista(nombre, objectTypeId) {
  const r = await post('/crm/v3/lists', {
    name: nombre,
    objectTypeId,
    processingType: 'MANUAL'
  });
  console.log(`  Lista creada: "${nombre}" (ID: ${r.list?.listId || r.listId})`);
  return r.list?.listId || r.listId;
}

async function agregarMiembros(listId, ids) {
  if (!ids.length) return;
  // Batch de 100
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const r = await fetch(`${API}/crm/v3/lists/${listId}/memberships/add`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordIdsToAdd: batch.map(String) })
    });
    await sleep(300);
  }
}

async function main() {
  const periodos = [
    { nombre: 'SINOR (Abril)', desde: '1775001600000', hasta: '1777593600000' },
    { nombre: 'EXPO (Mayo)',   desde: '1777593600000', hasta: '1780185600000' }
  ];

  const nuevosVendedoresIds = [];     // Contact IDs
  const nuevasInmobiliariasIds = [];  // Company IDs
  const existentesConConsultaIds = []; // Company IDs

  for (const periodo of periodos) {
    console.log(`\nProcesando ${periodo.nombre}...`);
    let offset = 0;
    const companies = [];

    while (true) {
      const search = await post('/crm/v3/objects/companies/search', {
        filterGroups: [{
          filters: [
            { propertyName: 'createdate', operator: 'BETWEEN', value: periodo.desde, highValue: periodo.hasta },
            { propertyName: 'razon_social', operator: 'HAS_PROPERTY' },
            { propertyName: 'id_interno', operator: 'NOT_HAS_PROPERTY' }
          ]
        }],
        properties: ['name', 'razon_social', 'hs_object_id'],
        limit: 200,
        after: offset || undefined
      });

      companies.push(...(search.results || []));
      if (!search.paging?.next?.after) break;
      offset = search.paging.next.after;
      await sleep(200);
    }

    process.stdout.write(`  ${companies.length} registros. Clasificando`);

    for (const co of companies) {
      const razonSocial = co.properties.razon_social || co.properties.name;
      const existentes = await buscarCompanyEnBase(razonSocial);
      await sleep(80);

      const contact = await getContactDeCompany(co.id);
      await sleep(80);

      if (existentes.length === 0) {
        // Inmobiliaria nueva
        nuevasInmobiliariasIds.push(co.id);
        if (contact?.id) nuevosVendedoresIds.push(contact.id);
      } else {
        // Inmobiliaria que ya existe
        existentesConConsultaIds.push(co.id);
        // Vendedor nuevo si el contact fue creado durante o después del evento
        if (contact?.id) {
          const creadoEn = new Date(contact.createdate).getTime();
          if (creadoEn >= parseInt(periodo.desde)) {
            nuevosVendedoresIds.push(contact.id);
          }
        }
      }
      process.stdout.write('.');
    }
    console.log(' ✓');
  }

  // Deduplicar
  const vendedoresUnicos = [...new Set(nuevosVendedoresIds)];
  const nuevasUnicas = [...new Set(nuevasInmobiliariasIds)];
  const existentesUnicas = [...new Set(existentesConConsultaIds)];

  console.log(`\nTotales finales:`);
  console.log(`  Nuevos vendedores (Contacts): ${vendedoresUnicos.length}`);
  console.log(`  Nuevas inmobiliarias (Companies): ${nuevasUnicas.length}`);
  console.log(`  Inmobiliarias existentes con consulta (Companies): ${existentesUnicas.length}`);

  // Listas ya creadas
  const listaNuevosVendedores = '656';
  const listaNuevasInmo = '657';
  const listaExistentes = '658';

  console.log('\nAgregando miembros...');
  await agregarMiembros(listaNuevosVendedores, vendedoresUnicos);
  console.log(`  Nuevos vendedores: ${vendedoresUnicos.length} agregados`);

  await agregarMiembros(listaNuevasInmo, nuevasUnicas);
  console.log(`  Nuevas inmobiliarias: ${nuevasUnicas.length} agregadas`);

  await agregarMiembros(listaExistentes, existentesUnicas);
  console.log(`  Inmobiliarias existentes: ${existentesUnicas.length} agregadas`);

  console.log('\n✅ Listo. Las 3 listas están disponibles en HubSpot.');
}

main().catch(console.error);
