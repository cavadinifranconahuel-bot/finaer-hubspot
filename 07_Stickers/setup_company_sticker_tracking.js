/**
 * setup_company_sticker_tracking.js
 * Crea propiedades y WF para registrar en la inmo qué piezas de sticker pidió.
 *
 * Qué hace:
 *   1. Crea grupo "Stickers Especiales" en Companies
 *   2. Crea 4 props boolean en Companies (sticker_a4, sticker_faja, sticker_gran_formato, sticker_pam)
 *   3. Crea 4 props boolean en Contacts  (sticker_solicita_a4, ..._faja, ..._gf, ..._pam)
 *   4. Crea WF INACTIVO que copia Contact → Company al enviar el form
 *
 * Uso:
 *   node setup_company_sticker_tracking.js             → dry-run
 *   node setup_company_sticker_tracking.js --ejecutar  → crea en HubSpot
 */

const https   = require('https');
const TOKEN   = process.env.HUBSPOT_TOKEN;
const DRY_RUN = !process.argv.includes('--ejecutar');

const FORM_GUID = '2b527eac-0b46-4908-9c70-8047d3bf9f46';

// ── Helper HTTP ───────────────────────────────────────────────────────────────
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
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try { resolve({ s: res.statusCode, b: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch(e) { resolve({ s: res.statusCode, b: Buffer.concat(chunks).toString() }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Crear grupo de propiedades ────────────────────────────────────────────────
async function createGroup(objectType, name, label) {
  const r = await api('POST', `/crm/v3/properties/${objectType}/groups`, { name, label, displayOrder: 99 });
  if (r.s === 201) { console.log(`  ✓ Grupo "${label}" creado (${objectType})`); return; }
  if (r.b.category === 'VALIDATION_ERROR' && r.b.message.includes('already exists')) {
    console.log(`  · Grupo "${name}" ya existe`); return;
  }
  throw new Error(`Error creando grupo ${name}: ${JSON.stringify(r.b)}`);
}

// ── Crear propiedad boolean (enumeration booleancheckbox) ─────────────────────
async function createBoolProp(objectType, name, label, groupName) {
  const r = await api('POST', `/crm/v3/properties/${objectType}`, {
    name, label, groupName,
    type: 'enumeration', fieldType: 'booleancheckbox',
    options: [
      { label: 'Sí', value: 'true',  displayOrder: 1, hidden: false },
      { label: 'No', value: 'false', displayOrder: 2, hidden: false }
    ]
  });
  if (r.s === 201) { console.log(`  ✓ Prop "${label}" creada (${objectType})`); return; }
  if (r.b.category === 'VALIDATION_ERROR' && r.b.message.includes('already exists')) {
    console.log(`  · Prop "${name}" ya existe`); return;
  }
  throw new Error(`Error creando propiedad ${name}: ${JSON.stringify(r.b)}`);
}

// ── Obtener nombre del grupo Contact existente de stickers ────────────────────
async function getContactStickerGroup() {
  const r = await api('GET', '/crm/v3/properties/contacts/groups', null);
  if (r.s !== 200) throw new Error('No se pudo leer grupos de contactos');
  const g = r.b.results.find(g => g.name.toLowerCase().includes('sticker'));
  return g ? g.name : null;
}

// ── Código fuente del custom code del WF ─────────────────────────────────────
const WF_CUSTOM_CODE = `
const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  const client = new hubspot.Client({ accessToken: process.env.HUBSPOT_TOKEN });
  const contactId = String(event.object.objectId);

  try {
    const contact = await client.crm.contacts.basicApi.getById(contactId, [
      'sticker_solicita_a4', 'sticker_solicita_faja',
      'sticker_solicita_gf', 'sticker_solicita_pam'
    ]);

    const assocResp = await client.crm.associations.v4.basicApi.getPage(
      'contacts', contactId, 'companies', undefined, 1
    );
    if (!assocResp.results || assocResp.results.length === 0) {
      return callback({ outputFields: {} });
    }

    const companyId = String(assocResp.results[0].toObjectId);
    const p = contact.properties;

    await client.crm.companies.basicApi.update(companyId, {
      properties: {
        sticker_a4:           p.sticker_solicita_a4   === 'true' ? 'true' : 'false',
        sticker_faja:         p.sticker_solicita_faja === 'true' ? 'true' : 'false',
        sticker_gran_formato: p.sticker_solicita_gf   === 'true' ? 'true' : 'false',
        sticker_pam:          p.sticker_solicita_pam  === 'true' ? 'true' : 'false'
      }
    });

    callback({ outputFields: {} });
  } catch (e) {
    console.error('Error actualizando company:', e.message);
    callback({ outputFields: {} });
  }
};
`.trim();

// ── Crear WF ──────────────────────────────────────────────────────────────────
async function createWorkflow() {
  // Usa SET_COMPANY_PROPERTY con token de contacto para copiar bool Contact → Company
  const makeSetAction = (companyProp, contactProp) => ({
    type: 'SET_COMPANY_PROPERTY',
    metadata: {
      name:  companyProp,
      value: '{{contact.' + contactProp + '}}'
    }
  });

  const body = {
    name: 'Stickers Especiales — Actualizar inmo al enviar form',
    type: 'DRIP_DELAY',
    enabled: false,
    onlyEnrollsManually: false,
    enrollmentCriteria: {
      triggerSets: [{
        triggers: [{ type: 'FORM_SUBMISSION', formId: FORM_GUID }]
      }],
      reEnrollmentTriggerSets: [{
        triggers: [{ type: 'FORM_SUBMISSION', formId: FORM_GUID }]
      }],
      shouldReEnroll: true
    },
    actions: [
      makeSetAction('sticker_a4',           'sticker_solicita_a4'),
      makeSetAction('sticker_faja',         'sticker_solicita_faja'),
      makeSetAction('sticker_gran_formato', 'sticker_solicita_gf'),
      makeSetAction('sticker_pam',          'sticker_solicita_pam')
    ]
  };

  const r = await api('POST', '/automation/v3/workflows', body);
  if (r.s === 200 || r.s === 201) {
    console.log(`  ✓ WF creado (ID: ${r.b.id}) — INACTIVO, activar desde HubSpot UI`);
    return r.b.id;
  }
  // Si SET_COMPANY_PROPERTY falla, mostrar los tipos válidos disponibles
  console.error(`  ✗ Error: ${r.s}`, JSON.stringify(r.b).slice(0, 600));
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!TOKEN) { console.error('Falta HUBSPOT_TOKEN'); process.exit(1); }

  if (DRY_RUN) {
    console.log('=== DRY RUN — lo que se crearía ===');
    console.log('  Company → Grupo: "Stickers Especiales"');
    console.log('  Company → Props: sticker_a4, sticker_faja, sticker_gran_formato, sticker_pam');
    console.log('  Contact → Props: sticker_solicita_a4, sticker_solicita_faja, sticker_solicita_gf, sticker_solicita_pam');
    console.log('  WF (inactivo): "Stickers Especiales — Actualizar inmo al enviar form"');
    console.log('\nEjecutá con --ejecutar para crear.');
    return;
  }

  console.log('\n── Propiedades Company ─────────────────────');
  await createGroup('companies', 'stickers_especiales', 'Stickers Especiales');
  await createBoolProp('companies', 'sticker_a4',           'A4',               'stickers_especiales');
  await createBoolProp('companies', 'sticker_faja',         'Faja',             'stickers_especiales');
  await createBoolProp('companies', 'sticker_gran_formato', 'Gran Formato',     'stickers_especiales');
  await createBoolProp('companies', 'sticker_pam',          'PAM / Apoyo Mutuo','stickers_especiales');

  console.log('\n── Propiedades Contact ─────────────────────');
  const contactGroup = await getContactStickerGroup();
  const cGroup = contactGroup || 'sticker_especiales';
  console.log(`  Usando grupo: "${cGroup}"`);
  await createBoolProp('contacts', 'sticker_solicita_a4',   'Sticker — Solicita A4',          cGroup);
  await createBoolProp('contacts', 'sticker_solicita_faja', 'Sticker — Solicita Faja',        cGroup);
  await createBoolProp('contacts', 'sticker_solicita_gf',   'Sticker — Solicita Gran Formato', cGroup);
  await createBoolProp('contacts', 'sticker_solicita_pam',  'Sticker — Solicita PAM',         cGroup);

  console.log('\n── Workflow ────────────────────────────────');
  await createWorkflow();

  console.log('\n✅ Listo. Activar el WF desde HubSpot UI cuando estés listo para producción.');
}

main().catch(console.error);
