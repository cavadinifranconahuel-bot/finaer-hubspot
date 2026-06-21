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

async function buscarCompanyPorNombre(nombre) {
  const r = await post('/crm/v3/objects/companies/search', {
    filterGroups: [{
      filters: [
        { propertyName: 'id_interno', operator: 'HAS_PROPERTY' },
        { propertyName: 'name', operator: 'CONTAINS_TOKEN', value: nombre.split(' ')[0] }
      ]
    }],
    properties: ['name', 'estado_de_actividad', 'id_interno', 'oficina_comercial'],
    limit: 3
  });
  return r.results || [];
}

async function buscarContactoPorEmail(email) {
  const r = await post('/crm/v3/objects/contacts/search', {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
    properties: ['email', 'firstname', 'lastname', 'createdate'],
    limit: 1
  });
  return r.results?.[0] || null;
}

async function getContactsDeCompany(companyId) {
  const r = await fetch(`${API}/crm/v4/objects/companies/${companyId}/associations/contacts`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  const data = await r.json();
  return data.results || [];
}

async function main() {
  // ABRIL (SINOR) y MAYO (EXPO)
  const periodos = [
    { nombre: 'SINOR (Abril)', desde: '1775001600000', hasta: '1777593600000' },
    { nombre: 'EXPO (Mayo)',   desde: '1777593600000', hasta: '1780185600000' }
  ];

  for (const periodo of periodos) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`EVENTO: ${periodo.nombre}`);
    console.log('='.repeat(70));

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
        properties: ['name', 'razon_social', 'estado_de_actividad', 'createdate', 'provincia', 'hs_object_source'],
        sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
        limit: 200,
        after: offset || undefined
      });

      companies.push(...(search.results || []));
      if (!search.paging?.next?.after) break;
      offset = search.paging.next.after;
      await sleep(200);
    }

    console.log(`\nTotal registros del evento: ${companies.length}\n`);

    let nuevasInmo = 0, inmoExistente = 0, vendedorNuevo = 0, sinDatos = 0;
    const detalle = [];

    for (const co of companies) {
      const razonSocial = co.properties.razon_social || co.properties.name;
      const nombre = co.properties.name;

      // Buscar si la inmobiliaria ya existe con id_interno
      const existentes = await buscarCompanyPorNombre(razonSocial);
      await sleep(80);

      // Obtener contacto del vendedor que completó el formulario
      const contactsAsoc = await getContactsDeCompany(co.id);
      let emailVendedor = null;
      let vendedorExistia = false;

      if (contactsAsoc.length > 0) {
        const contactId = String(contactsAsoc[0].toObjectId);
        const contactData = await post('/crm/v3/objects/contacts/batch/read', {
          inputs: [{ id: contactId }],
          properties: ['email', 'firstname', 'lastname', 'createdate']
        });
        const contact = contactData.results?.[0];
        if (contact) {
          emailVendedor = contact.properties.email;
          // El vendedor ya existía si fue creado antes del evento
          const creadoEn = new Date(contact.properties.createdate).getTime();
          vendedorExistia = creadoEn < parseInt(periodo.desde);
        }
      }
      await sleep(80);

      let estado = 'INMOBILIARIA NUEVA';
      let estadoActividad = '-';
      let matchNombre = '-';

      if (existentes.length > 0) {
        inmoExistente++;
        estadoActividad = existentes[0].properties.estado_de_actividad || 'SIN ESTADO';
        matchNombre = existentes[0].properties.name;
        estado = `YA EN BASE (${estadoActividad})`;
        if (!vendedorExistia) {
          vendedorNuevo++;
          estado += ' | VENDEDOR NUEVO';
        }
      } else {
        nuevasInmo++;
      }

      detalle.push({
        nombre: nombre || razonSocial,
        razonSocial,
        estado,
        estadoActividad,
        matchEnBase: matchNombre,
        emailVendedor: emailVendedor || '-',
        vendedorNuevo: !vendedorExistia && existentes.length > 0 ? 'SÍ' : 'NO',
        provincia: co.properties.provincia || '-'
      });
    }

    // Resumen
    console.log('RESUMEN:');
    console.log(`  ✅ Inmobiliarias ya en la base:    ${inmoExistente}`);
    console.log(`  🆕 Inmobiliarias nuevas:           ${nuevasInmo}`);
    console.log(`  👤 Vendedores nuevos (inmo existe): ${vendedorNuevo}`);
    console.log('');

    // Desglose por estado de actividad
    const porEstado = {};
    for (const d of detalle.filter(d => d.estadoActividad !== '-')) {
      porEstado[d.estadoActividad] = (porEstado[d.estadoActividad] || 0) + 1;
    }
    if (Object.keys(porEstado).length > 0) {
      console.log('  Desglose de las que ya estaban en base:');
      for (const [estado, count] of Object.entries(porEstado)) {
        console.log(`    ${estado}: ${count}`);
      }
    }

    console.log('\nDETALLE:');
    console.log('-'.repeat(70));
    for (const d of detalle) {
      console.log(`  ${d.nombre}`);
      console.log(`    Estado: ${d.estado}`);
      if (d.matchEnBase !== '-') console.log(`    Match en base: ${d.matchEnBase}`);
      console.log(`    Email vendedor: ${d.emailVendedor} | Vendedor nuevo: ${d.vendedorNuevo}`);
      console.log(`    Provincia: ${d.provincia}`);
      console.log('');
    }
  }
}

main().catch(console.error);
