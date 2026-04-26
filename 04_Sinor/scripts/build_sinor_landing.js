const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const TOKEN = 'pat-eu1-87f3fc69-9f28-409b-9046-db09ef4e6d31';

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

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

function uploadFile(filePath, folderPath) {
  return new Promise((resolve, reject) => {
    const filename = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif' };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

    // Build multipart body
    const optionsJson = JSON.stringify({ access: 'PUBLIC_INDEXABLE', overwrite: false, duplicateValidationScope: 'ENTIRE_PORTAL', duplicateValidationStrategy: 'NONE' });
    let bodyParts = [];
    bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="options"\r\n\r\n${optionsJson}\r\n`));
    bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="folderPath"\r\n\r\n${folderPath}\r\n`));
    bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    bodyParts.push(fileBuffer);
    bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const bodyBuffer = Buffer.concat(bodyParts);

    const req = https.request({
      hostname: 'api.hubapi.com',
      path: '/files/v3/files',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      }
    }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => {
        try {
          const r = JSON.parse(Buffer.concat(c).toString('utf8'));
          resolve(r);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function run() {

  // 1. Images already uploaded
  const bannerUrl = 'https://145725856.fs1.hubspotusercontent-eu1.net/hubfs/145725856/eventos/sinor-2026/Banner%201200%20x%20600.jpg';
  const logoUrl   = 'https://145725856.fs1.hubspotusercontent-eu1.net/hubfs/145725856/eventos/sinor-2026/Logo%20Tag%20Line.png';
  console.log('✓ Imágenes ya subidas.');

  // 2. Create form
  console.log('\n📋 Creando formulario SINOR 2026...');
  // Use legacy v2 API which is more permissive
  const formBodyV2 = {
    name: 'SINOR 2026 - Registro de Evento',
    submitText: 'Registrarme al evento →',
    formFieldGroups: [
      { fields: [
        { name: 'firstname',   label: 'Nombre',             required: true, fieldType: 'text',   displayOrder: 0 },
        { name: 'lastname',    label: 'Apellido',           required: true, fieldType: 'text',   displayOrder: 1 }
      ]},
      { fields: [
        { name: 'company',     label: 'Inmobiliaria',       required: true, fieldType: 'text',   displayOrder: 2 },
        { name: 'jobtitle',    label: 'Cargo',              required: true, fieldType: 'text',   displayOrder: 3 }
      ]},
      { fields: [
        { name: 'city',        label: 'Localidad',          required: true, fieldType: 'text',   displayOrder: 4 }
      ]},
      { fields: [
        { name: 'email',       label: 'Correo electrónico', required: true, fieldType: 'text',   displayOrder: 5 }
      ]},
      { fields: [
        { name: 'mobilephone', label: 'Celular',            required: true, fieldType: 'text',   displayOrder: 6 }
      ]}
    ]
  };

  const form = await apiRequest('POST', '/forms/v2/forms', formBodyV2);
  const formId = form.guid;
  console.log('✓ Formulario creado:', formId, form.name || form.message);

  if (!formId) {
    console.log('ERROR creando form:', JSON.stringify(form).slice(0,300));
    return;
  }

  // 3. Build landing page HTML sections

  const headerHtml = `
<div style="background:#ffffff; padding:16px 40px; text-align:center; border-bottom:3px solid #E8E8E8;">
  <img src="${logoUrl}" alt="Finaer - Garantías para alquilar" style="height:55px; width:auto;">
</div>`.trim();

  const heroHtml = `
<div style="position:relative; line-height:0;">
  <img src="${bannerUrl}" alt="SINOR 2026 - Salón Inmobiliario Corredor Norte" style="width:100%; display:block; max-height:500px; object-fit:cover;">
</div>
<div style="background:#12122A; color:#ffffff; padding:18px 40px; text-align:center; line-height:1.6;">
  <span style="font-size:15px; letter-spacing:0.5px;">
    📍 <strong>Sofitel Le Dôme · Cardales</strong>
    &nbsp;&nbsp;|&nbsp;&nbsp;
    📅 <strong>13 de Abril 2026</strong>
    &nbsp;&nbsp;|&nbsp;&nbsp;
    ⏰ <strong>9:00hs a 18:00hs</strong>
  </span>
  <br>
  <span style="font-size:13px; color:#F0C040; letter-spacing:0.3px;">✅ Entrada libre y gratuita &nbsp;·&nbsp; Inscripción obligatoria</span>
</div>`.trim();

  const formHeaderHtml = `
<div style="background:#F7F7F7; padding:40px 40px 24px; text-align:center;">
  <h1 style="font-size:30px; color:#414042; margin:0 0 10px; font-weight:700; line-height:1.3;">
    Registrate al evento de Finaer
  </h1>
  <p style="font-size:17px; color:#666666; margin:0 0 8px;">
    Completá el formulario y asegurá tu lugar en el <strong>SINOR 2026</strong>
  </p>
  <p style="font-size:13px; color:#999; margin:0;">
    Los datos ingresados serán utilizados exclusivamente para la confirmación de tu registro.
  </p>
</div>`.trim();

  const whyHtml = `
<div style="background:#ffffff; padding:40px; max-width:900px; margin:0 auto;">
  <h2 style="font-size:22px; color:#414042; margin:0 0 20px; text-align:center; font-weight:700;">
    ¿Por qué asistir al <span style="color:#D0021B;">SINOR 2026</span>?
  </h2>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
    <div style="background:#F7F7F7; border-left:4px solid #D0021B; padding:16px 20px; border-radius:4px;">
      <p style="margin:0; font-size:15px; color:#414042;"><strong>🤝 Networking profesional</strong><br><span style="color:#666; font-size:13px;">Conectate con inmobiliarias, inversores y referentes del sector del Corredor Norte.</span></p>
    </div>
    <div style="background:#F7F7F7; border-left:4px solid #D0021B; padding:16px 20px; border-radius:4px;">
      <p style="margin:0; font-size:15px; color:#414042;"><strong>🎤 Charlas y paneles</strong><br><span style="color:#666; font-size:13px;">Contenido de alto valor sobre el mercado de alquileres y las tendencias 2026.</span></p>
    </div>
    <div style="background:#F7F7F7; border-left:4px solid #D0021B; padding:16px 20px; border-radius:4px;">
      <p style="margin:0; font-size:15px; color:#414042;"><strong>🚀 Novedades Finaer 2026</strong><br><span style="color:#666; font-size:13px;">Conocé los nuevos productos, condiciones y diferenciales para este año.</span></p>
    </div>
    <div style="background:#F7F7F7; border-left:4px solid #D0021B; padding:16px 20px; border-radius:4px;">
      <p style="margin:0; font-size:15px; color:#414042;"><strong>📍 Venue Premium</strong><br><span style="color:#666; font-size:13px;">Sofitel Luxury Hotels · Salón Le Dôme · Cardales. Entrada libre y gratuita.</span></p>
    </div>
  </div>
</div>`.trim();

  const footerHtml = `
<div style="background:#414042; color:#ffffff; padding:24px 40px; text-align:center; margin-top:40px;">
  <img src="${logoUrl}" alt="Finaer" style="height:36px; width:auto; filter:brightness(0) invert(1); margin-bottom:10px; display:block; margin:0 auto 10px;">
  <p style="margin:0; font-size:13px; color:#cccccc;">© 2026 Finaer · Garantías para alquilar</p>
  <p style="margin:6px 0 0; font-size:12px; color:#999999;">
    <a href="https://www.finaersa.com.ar" style="color:#F0C040; text-decoration:none;">www.finaersa.com.ar</a>
  </p>
</div>`.trim();

  // 4. Create landing page (clone structure from adhesion: 229990531264)
  console.log('\n🏗  Clonando estructura base y creando landing SINOR...');

  // First get the base page to copy its layoutSections structure
  const basePage = await apiRequest('GET', '/cms/v3/pages/landing-pages/229990531264');
  const ls = JSON.parse(JSON.stringify(basePage.layoutSections)); // deep clone

  // Map widget names to content
  const widgetContent = {
    'widget_1745254113596': headerHtml,
    'widget_1745255776476': heroHtml,
    'widget_1745255805864': formHeaderHtml,
    'widget_1745254160831': whyHtml,
    'widget_1745255070582': footerHtml
  };

  // Walk and update richTextContentHTML
  function updateWidgets(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.name && widgetContent[obj.name] && obj.params) {
      obj.params.richTextContentHTML = widgetContent[obj.name];
    }
    // Update form widget
    if (obj.name === 'widget_1745253208703' && obj.params && obj.params.form) {
      obj.params.form.form_id = formId;
      obj.params.form.response_type = 'inline';
      obj.params.form.message = '<div style="text-align:center; padding:30px;"><h2 style="color:#414042;">¡Registro confirmado! 🎉</h2><p style="color:#666;">Te esperamos el <strong>13 de Abril</strong> en el Sofitel Le Dôme, Cardales.<br>Recibirás un correo de confirmación a la brevedad.</p></div>';
      delete obj.params.form.redirect_url;
    }
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) v.forEach(i => updateWidgets(i));
      else if (typeof v === 'object') updateWidgets(v);
    }
  }
  updateWidgets(ls);

  const landingBody = {
    name: 'SINOR 2026 - Registro de Evento',
    slug: 'sinor-2026',
    htmlTitle: 'SINOR 2026 · Registro de Evento | Finaer - Garantías para alquilar',
    metaDescription: 'Registrate al SINOR 2026 — Salón Inmobiliario Corredor Norte. 13 de Abril, Sofitel Le Dôme, Cardales. Entrada libre y gratuita. Inscripción obligatoria.',
    language: 'es',
    contentTypeCategory: 1,
    currentState: 'DRAFT',
    layoutSections: ls
  };

  const landing = await apiRequest('POST', '/cms/v3/pages/landing-pages', landingBody);
  console.log('✓ Landing creada:', landing.id, landing.name || landing.message);
  if (landing.id) {
    console.log('  URL preview: https://landing.finaersa.com.ar/' + (landing.slug || 'sinor-2026'));
    console.log('  Editor: https://app-eu1.hubspot.com/pages/145725856/editor/' + landing.id + '/content');
  } else {
    console.log('ERROR:', JSON.stringify(landing).slice(0,300));
  }

  console.log('\n✅ Listo.');
  console.log('Form ID:', formId);
  console.log('Landing ID:', landing.id);
}

run().catch(console.error);
