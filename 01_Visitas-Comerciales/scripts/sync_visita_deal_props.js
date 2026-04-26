const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = 'pat-eu1-87f3fc69-9f28-409b-9046-db09ef4e6d31';
const WORKFLOW_B_ID = '4092196041';

// ── XLSX parsing (without npm — read binary, find strings) ──────────────────
// We'll use the xlsx package if available, otherwise fall back to the API
let XLSX;
try { XLSX = require('xlsx'); } catch(e) { XLSX = null; }

function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json; charset=utf-8' };
    if (data) headers['Content-Length'] = data.length;
    const req = https.request({ hostname: 'api.hubapi.com', path: apiPath, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => {
        const text = Buffer.concat(c).toString('utf8');
        try { resolve(text ? JSON.parse(text) : {}); } catch(e) { resolve({ _raw: text }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Fetch all properties for an object type (handles pagination)
async function getAllProperties(objectType) {
  let all = [];
  let after = null;
  do {
    const qs = after ? `?limit=500&after=${after}` : '?limit=500';
    const res = await apiRequest('GET', `/crm/v3/properties/${objectType}${qs}`);
    if (res.results) all = all.concat(res.results);
    after = res.paging && res.paging.next ? res.paging.next.after : null;
  } while (after);
  return all;
}

// Fetch property group (ensure visitas_comerciales exists on deals)
async function ensureGroup() {
  const res = await apiRequest('GET', '/crm/v3/properties/0-3/groups/visitas_comerciales');
  if (res.name) return; // exists
  await apiRequest('POST', '/crm/v3/properties/0-3/groups', {
    name: 'visitas_comerciales',
    label: 'Visitas Comerciales',
    displayOrder: 10
  });
  console.log('  Grupo visitas_comerciales creado en Deal');
}

async function run() {
  // ── 1. Read Contact visita_* properties from API ─────────────────────────
  console.log('Leyendo propiedades Contact visita_* desde API...');
  const contactProps = await getAllProperties('contacts');
  const visitaContact = contactProps.filter(p => p.name.startsWith('visita_'));
  console.log(`  ${visitaContact.length} propiedades visita_* en Contact`);

  // ── 2. Read existing Deal visita_* properties ────────────────────────────
  console.log('Leyendo propiedades Deal visita_* existentes...');
  const dealProps = await getAllProperties('deals');
  const existingDealVisita = new Set(dealProps.filter(p => p.name.startsWith('visita_')).map(p => p.name));
  console.log(`  ${existingDealVisita.size} propiedades visita_* ya en Deal:`, [...existingDealVisita].join(', '));

  // ── 3. Ensure group exists ────────────────────────────────────────────────
  await ensureGroup();

  // ── 4. Create missing properties on Deal ─────────────────────────────────
  const toCreate = visitaContact.filter(p => !existingDealVisita.has(p.name));
  console.log(`\nCreando ${toCreate.length} propiedades faltantes en Deal...`);

  const created = [];
  const errored = [];

  for (const cp of toCreate) {
    const body = {
      name: cp.name,
      label: cp.label,
      type: cp.type,
      fieldType: cp.fieldType,
      groupName: 'visitas_comerciales',
      description: cp.description || '',
      displayOrder: cp.displayOrder || -1,
      hasUniqueValue: false,
      hidden: false,
      formField: false
    };
    if (cp.options && cp.options.length > 0) {
      body.options = cp.options.map(o => ({
        label: o.label,
        value: o.value,
        displayOrder: o.displayOrder,
        hidden: o.hidden || false
      }));
    }
    const res = await apiRequest('POST', '/crm/v3/properties/0-3', body);
    if (res.name) {
      console.log(`  ✅ ${res.name}`);
      created.push(res.name);
    } else {
      const msg = JSON.stringify(res).slice(0, 200);
      console.log(`  ❌ ${cp.name}: ${msg}`);
      errored.push(cp.name);
    }
  }

  // ── 5. Full list of visita_* that now exist on Deal ───────────────────────
  const allDealVisita = [...existingDealVisita, ...created];
  // Also add visita_empresa_id if it exists (it's a deal property used for association)
  if (!allDealVisita.includes('visita_empresa_id')) {
    const has = dealProps.find(p => p.name === 'visita_empresa_id');
    if (has) allDealVisita.push('visita_empresa_id');
  }
  console.log(`\nTotal propiedades visita_* en Deal ahora: ${allDealVisita.length}`);

  // ── 6. Fetch Workflow B ────────────────────────────────────────────────────
  console.log('\nFetching Workflow B...');
  const wf = await apiRequest('GET', `/automation/v4/flows/${WORKFLOW_B_ID}`);

  // Find the Create Deal action (0-14)
  let createDealAction = null;
  function findCreateDeal(actions) {
    for (const a of actions) {
      if (a.actionTypeId === '0-14' || a.actionTypeId === 0-14 || (a.type && a.type.includes('CREATE'))) {
        createDealAction = a;
        return;
      }
      if (a.actionTypeId && String(a.actionTypeId) === '0-14') {
        createDealAction = a;
        return;
      }
      if (a.actions && a.actions.length) findCreateDeal(a.actions);
    }
  }
  findCreateDeal(wf.actions || []);

  if (!createDealAction) {
    // Try deeper search
    const str = JSON.stringify(wf.actions);
    console.log('No encontré 0-14 directamente. Buscando en JSON...');
    const match = str.match(/"actionTypeId":"0-14"/);
    if (match) console.log('Existe 0-14 en el JSON pero la función walk no lo encontró');
    console.log('Actions summary:', (wf.actions||[]).map(a => a.actionTypeId).join(', '));
    return;
  }

  console.log('Create Deal action encontrada, actionTypeId:', createDealAction.actionTypeId);

  // ── 7. Build property assignments ─────────────────────────────────────────
  // Properties to set from Contact → Deal via token or direct value
  // For the Create Deal action, we use token-based values from the enrolling Contact
  // BUT the 0-14 action for "Create Deal" takes static values, not Contact tokens.
  // We need to check: either use {{contact.property}} tokens OR use a separate
  // "Copy to Deal" step using 0-5 (Set Property) actions via dataSources.

  // The Create Deal action (0-14) in Workflow B accepts property assignments.
  // Let's check what format existing assignments use.
  const existingProps = createDealAction.fields || createDealAction.properties ||
                        (createDealAction.typeMetadata && createDealAction.typeMetadata.properties) || [];

  console.log('\nEstructura actual del Create Deal action:');
  console.log(JSON.stringify(createDealAction, null, 2).slice(0, 1000));
}

run().catch(console.error);
