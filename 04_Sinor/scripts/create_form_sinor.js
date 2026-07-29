// Clone existing form and update fields
const https = require('https');
const TOKEN = process.env.HUBSPOT_TOKEN;

function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json; charset=utf-8' };
    if (data) headers['Content-Length'] = data.length;
    const req = https.request({ hostname: 'api.hubapi.com', path: apiPath, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(c).toString('utf8'))); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  // 1. Clone the adhesion events form (6cbbbf24-440d-4fb5-99b4-7edecf443d87)
  console.log('Clonando formulario base...');
  const cloned = await apiRequest('POST', '/marketing/v3/forms/6cbbbf24-440d-4fb5-99b4-7edecf443d87/clone', {});
  console.log('Clone result:', cloned.id, cloned.name, cloned.message);

  if (!cloned.id) {
    console.log('ERROR clonando:', JSON.stringify(cloned));
    return;
  }

  // 2. Update the cloned form with SINOR fields
  const updateBody = {
    name: 'SINOR 2026 - Registro de Evento',
    displayOptions: {
      submitButtonText: 'Registrarme al evento →',
      theme: 'default_style',
      renderRawHtml: false
    },
    fieldGroups: [
      { groupType: 'default_group', richTextType: 'text', fields: [
        { objectTypeId: '0-1', name: 'firstname',   label: 'Nombre',             required: true,  hidden: false, fieldType: 'single_line_text' },
        { objectTypeId: '0-1', name: 'lastname',    label: 'Apellido',           required: true,  hidden: false, fieldType: 'single_line_text' }
      ]},
      { groupType: 'default_group', richTextType: 'text', fields: [
        { objectTypeId: '0-1', name: 'company',     label: 'Inmobiliaria',       required: true,  hidden: false, fieldType: 'single_line_text' },
        { objectTypeId: '0-1', name: 'jobtitle',    label: 'Cargo',              required: true,  hidden: false, fieldType: 'single_line_text' }
      ]},
      { groupType: 'default_group', richTextType: 'text', fields: [
        { objectTypeId: '0-1', name: 'city',        label: 'Localidad',          required: true,  hidden: false, fieldType: 'single_line_text' }
      ]},
      { groupType: 'default_group', richTextType: 'text', fields: [
        { objectTypeId: '0-1', name: 'email',       label: 'Correo electrónico', required: true,  hidden: false, fieldType: 'email',
          validation: { blockedEmailDomains: [], useDefaultBlockList: false } }
      ]},
      { groupType: 'default_group', richTextType: 'text', fields: [
        { objectTypeId: '0-1', name: 'mobilephone', label: 'Celular',            required: true,  hidden: false, fieldType: 'phone',
          validation: { minAllowedDigits: 7, maxAllowedDigits: 20 } }
      ]}
    ]
  };

  console.log('Actualizando campos del formulario...');
  const updated = await apiRequest('PATCH', '/marketing/v3/forms/' + cloned.id, updateBody);
  console.log('Update result:', updated.id, updated.name, updated.message);

  if (updated.id) {
    console.log('✅ Form ID:', updated.id);
  } else {
    console.log('ERROR update:', JSON.stringify(updated).slice(0, 400));
  }
}
run().catch(console.error);
