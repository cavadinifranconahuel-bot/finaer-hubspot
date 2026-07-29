const https = require('https');
const TOKEN = process.env.HUBSPOT_TOKEN;

function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json; charset=utf-8' };
    if (data) headers['Content-Length'] = data.length;
    const req = https.request({ hostname: 'api.hubapi.com', path: apiPath, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(c).toString('utf8'))); } catch(e) { reject(new Error(Buffer.concat(c).toString('utf8').slice(0,200))); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  const formBody = {
    name: 'SINOR 2026 - Registro de Evento',
    formType: 'hubspot',
    configuration: {
      language: 'es',
      cloneable: true,
      postSubmitAction: {
        type: 'thank_you',
        value: 'Registro confirmado. Te esperamos el 13 de Abril en el Sofitel Le Dome, Cardales.'
      },
      editable: true,
      archivable: true,
      recaptchaEnabled: false,
      notifyContactOwner: false,
      notifyRecipients: [],
      createNewContactForNewEmail: true,
      prePopulateKnownValues: true,
      allowLinkToResetKnownValues: false,
      embedType: 'V4'
    },
    displayOptions: {
      renderRawHtml: false,
      theme: 'default_style',
      submitButtonText: 'Registrarme al evento →',
      style: {
        fontFamily: 'arial, helvetica, sans-serif',
        backgroundWidth: '100%',
        labelTextColor: '#414042',
        labelTextSize: '13px',
        helpTextColor: '#7C98B6',
        helpTextSize: '11px',
        legalConsentTextColor: '#414042',
        legalConsentTextSize: '14px',
        submitColor: '#D0021B',
        submitAlignment: 'center',
        submitFontColor: '#ffffff',
        submitSize: '14px'
      },
      cssClass: null
    },
    legalConsentOptions: { type: 'none' },
    fieldGroups: [
      { groupType: 'default_group', richTextType: 'text', fields: [
        { objectTypeId: '0-1', name: 'firstname',   label: 'Nombre',             required: true, hidden: false, fieldType: 'single_line_text' },
        { objectTypeId: '0-1', name: 'lastname',    label: 'Apellido',           required: true, hidden: false, fieldType: 'single_line_text' }
      ]},
      { groupType: 'default_group', richTextType: 'text', fields: [
        { objectTypeId: '0-1', name: 'company',     label: 'Inmobiliaria',       required: true, hidden: false, fieldType: 'single_line_text' },
        { objectTypeId: '0-1', name: 'jobtitle',    label: 'Cargo',              required: true, hidden: false, fieldType: 'single_line_text' }
      ]},
      { groupType: 'default_group', richTextType: 'text', fields: [
        { objectTypeId: '0-1', name: 'city',        label: 'Localidad',          required: true, hidden: false, fieldType: 'single_line_text' }
      ]},
      { groupType: 'default_group', richTextType: 'text', fields: [
        { objectTypeId: '0-1', name: 'email',       label: 'Correo electrónico', required: true, hidden: false, fieldType: 'email',
          validation: { blockedEmailDomains: [], useDefaultBlockList: false } }
      ]},
      { groupType: 'default_group', richTextType: 'text', fields: [
        { objectTypeId: '0-1', name: 'mobilephone', label: 'Celular',            required: true, hidden: false, fieldType: 'phone' }
      ]}
    ]
  };

  console.log('Creando formulario SINOR 2026...');
  const form = await apiRequest('POST', '/marketing/v3/forms', formBody);

  if (form.id) {
    console.log('✅ Form creado:', form.id, '-', form.name);
    // Save ID to file for use in landing script
    require('fs').writeFileSync('C:/Users/Usuario/sinor_form_id.txt', form.id);
  } else {
    console.log('ERROR:', JSON.stringify(form).slice(0, 500));
  }
}
run().catch(e => console.log('CATCH:', e.message));
