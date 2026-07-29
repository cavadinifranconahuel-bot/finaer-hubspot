const https = require('https');

const TOKEN = process.env.HUBSPOT_TOKEN;
const TABLE_ID = '2845741248';

// Stages activas (garantía en vigor)
const STAGES_ACTIVAS = new Set([
  '1934076147', // Contrato de locación firmado
  '1934076148', // Legajo Completo
  'closedlost',  // Contrato de fianza firmado
  'contractsent', // Aprobada
  'closedwon',   // Pendiente firma fianza
]);

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.hubapi.com', path, method,
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        const raw = Buffer.concat(c).toString();
        try { resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    }).on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getAllContactsConDNI() {
  const contacts = [];
  let after = undefined;
  while (true) {
    const body = {
      filterGroups: [{ filters: [{ propertyName: 'dni_inquilino', operator: 'HAS_PROPERTY' }] }],
      properties: ['firstname', 'lastname', 'dni_inquilino'],
      limit: 100,
      ...(after ? { after } : {})
    };
    const r = await api('POST', '/crm/v3/objects/contacts/search', body);
    contacts.push(...(r.body.results || []));
    if (!r.body.paging?.next?.after) break;
    after = r.body.paging.next.after;
    await sleep(200);
  }
  return contacts;
}

async function getDealActivoDeContacto(contactId) {
  const assoc = await api('GET', `/crm/v3/objects/contacts/${contactId}/associations/deals`);
  const dealIds = (assoc.body.results || []).map(r => r.id);
  if (!dealIds.length) return null;

  const batch = await api('POST', '/crm/v3/objects/deals/batch/read', {
    inputs: dealIds.map(id => ({ id })),
    properties: ['codigo_de_garantia__clonada_', 'domicilio_del_inmueble', 'pipeline', 'dealstage']
  });

  const deals = (batch.body.results || [])
    .filter(d => d.properties.pipeline === 'default' && STAGES_ACTIVAS.has(d.properties.dealstage))
    .sort((a, b) => new Date(b.properties.hs_lastmodifieddate || 0) - new Date(a.properties.hs_lastmodifieddate || 0));

  return deals[0] || null;
}

async function getCompanyDeDeal(dealId) {
  const assoc = await api('GET', `/crm/v3/objects/deals/${dealId}/associations/companies`);
  const companyIds = (assoc.body.results || []).map(r => r.id);
  if (!companyIds.length) return null;
  const company = await api('GET', `/crm/v3/objects/companies/${companyIds[0]}?properties=name`);
  return company.body.properties?.name || null;
}

async function upsertHubDBRow(dni, nombre, garantia, domicilio, inmobiliaria, contactId) {
  // Buscar si ya existe fila con ese DNI
  const existing = await api('GET', `/cms/v3/hubdb/tables/${TABLE_ID}/rows/draft?dni__eq=${encodeURIComponent(dni)}`);
  const rows = existing.body.results || [];

  const values = { dni, nombre_inquilino: nombre, numero_garantia: garantia || '', domicilio_inmueble: domicilio || '', inmobiliaria: inmobiliaria || '', contact_id: contactId };

  if (rows.length > 0) {
    await api('PATCH', `/cms/v3/hubdb/tables/${TABLE_ID}/rows/${rows[0].id}/draft`, { values });
  } else {
    await api('POST', `/cms/v3/hubdb/tables/${TABLE_ID}/rows`, { values });
  }
}

async function main() {
  console.log('=== Carga inicial HubDB — Inquilinos por DNI ===\n');

  const contactos = await getAllContactsConDNI();
  console.log(`Contactos con DNI: ${contactos.length}\n`);

  let ok = 0, sinDeal = 0, errores = 0;

  for (let i = 0; i < contactos.length; i++) {
    const c = contactos[i];
    const dni = c.properties.dni_inquilino;
    const nombre = `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim();

    try {
      const deal = await getDealActivoDeContacto(c.id);
      if (!deal) {
        console.log(`[${i+1}/${contactos.length}] SIN DEAL — ${nombre} (${dni})`);
        sinDeal++;
        await sleep(150);
        continue;
      }

      const garantia = deal.properties.codigo_de_garantia__clonada_ || '';
      const domicilio = deal.properties.domicilio_del_inmueble || '';
      const inmobiliaria = await getCompanyDeDeal(deal.id);

      await upsertHubDBRow(dni, nombre, garantia, domicilio, inmobiliaria || '', c.id);

      console.log(`[${i+1}/${contactos.length}] OK — ${nombre} | ${garantia} | ${domicilio || 'sin domicilio'} | ${inmobiliaria || 'sin inmobiliaria'}`);
      ok++;
    } catch (e) {
      console.log(`[${i+1}/${contactos.length}] ERROR — ${nombre}: ${e.message}`);
      errores++;
    }

    await sleep(200);
  }

  // Publicar la tabla
  await api('POST', `/cms/v3/hubdb/tables/${TABLE_ID}/draft/push-live`);

  console.log(`\n=== RESULTADO ===`);
  console.log(`OK: ${ok} | Sin deal activo: ${sinDeal} | Errores: ${errores}`);
  console.log(`Tabla publicada. ID: ${TABLE_ID}`);
}

main().catch(console.error);
