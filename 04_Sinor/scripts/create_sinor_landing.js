const https = require('https');
const TOKEN  = process.env.HUBSPOT_TOKEN;
const FORM_ID = '90322fde-d53b-4850-8764-da9009db2c59';
const BANNER_URL = 'https://145725856.fs1.hubspotusercontent-eu1.net/hubfs/145725856/eventos/sinor-2026/Banner%201200%20x%20600.jpg';
const LOGO_URL   = 'https://145725856.fs1.hubspotusercontent-eu1.net/hubfs/145725856/eventos/sinor-2026/Logo%20Tag%20Line.png';

function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json; charset=utf-8' };
    if (data) headers['Content-Length'] = data.length;
    const req = https.request({ hostname: 'api.hubapi.com', path: apiPath, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => {
        const text = Buffer.concat(c).toString('utf8');
        try { resolve(text ? JSON.parse(text) : {}); } catch(e) { resolve({}); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── HTML sections ─────────────────────────────────────────────────────────────

const headerHtml = `
<div style="background:#ffffff;padding:14px 32px;text-align:center;border-bottom:3px solid #f0f0f0;">
  <img src="${LOGO_URL}" alt="Finaer - Garantías para alquilar" style="height:52px;width:auto;display:inline-block;">
</div>`.trim();

const heroHtml = `
<div style="line-height:0;">
  <img src="${BANNER_URL}" alt="SINOR 2026 - Salón Inmobiliario Corredor Norte con Finaer" style="width:100%;display:block;">
</div>
<div style="background:#0E0E2C;color:#ffffff;padding:16px 24px;text-align:center;line-height:1.7;">
  <p style="margin:0;font-size:15px;font-family:Arial,sans-serif;">
    <span style="color:#F5C518;font-weight:bold;">📅 13 de Abril 2026</span>
    &nbsp;&nbsp;·&nbsp;&nbsp;
    <span style="font-weight:bold;">⏰ 9:00hs a 18:00hs</span>
    &nbsp;&nbsp;·&nbsp;&nbsp;
    <span style="font-weight:bold;">📍 Sofitel Le Dôme · Cardales</span>
  </p>
  <p style="margin:6px 0 0;font-size:13px;color:#A8D8A8;font-family:Arial,sans-serif;">✅ Entrada libre y gratuita &nbsp;·&nbsp; Inscripción obligatoria</p>
</div>`.trim();

const formHeaderHtml = `
<div style="background:#F8F8F8;padding:36px 24px 20px;text-align:center;">
  <h1 style="font-size:27px;color:#414042;margin:0 0 10px;font-weight:700;font-family:Arial,sans-serif;line-height:1.3;">
    Registrate al evento de Finaer
  </h1>
  <p style="font-size:16px;color:#666666;margin:0 0 6px;font-family:Arial,sans-serif;">
    Completá el formulario y asegurá tu lugar en el <strong style="color:#D0021B;">SINOR 2026</strong>
  </p>
  <p style="font-size:12px;color:#aaaaaa;margin:0;font-family:Arial,sans-serif;">
    Todos los campos son obligatorios · Los datos se usan exclusivamente para confirmar tu registro.
  </p>
</div>`.trim();

const whyHtml = `
<div style="background:#ffffff;padding:36px 24px 40px;max-width:800px;margin:0 auto;">
  <h2 style="font-size:20px;color:#414042;margin:0 0 20px;text-align:center;font-family:Arial,sans-serif;">
    ¿Por qué asistir al <span style="color:#D0021B;">SINOR 2026</span>?
  </h2>
  <table width="100%" cellpadding="0" cellspacing="12" style="border-collapse:separate;border-spacing:12px;">
    <tr>
      <td width="50%" style="background:#F8F8F8;border-left:4px solid #D0021B;padding:16px 18px;border-radius:4px;vertical-align:top;">
        <p style="margin:0;font-size:15px;color:#414042;font-family:Arial,sans-serif;font-weight:700;">🤝 Networking profesional</p>
        <p style="margin:6px 0 0;font-size:13px;color:#666666;font-family:Arial,sans-serif;line-height:1.5;">Conectate con inmobiliarias, inversores y referentes del sector del Corredor Norte.</p>
      </td>
      <td width="50%" style="background:#F8F8F8;border-left:4px solid #D0021B;padding:16px 18px;border-radius:4px;vertical-align:top;">
        <p style="margin:0;font-size:15px;color:#414042;font-family:Arial,sans-serif;font-weight:700;">🎤 Charlas y paneles</p>
        <p style="margin:6px 0 0;font-size:13px;color:#666666;font-family:Arial,sans-serif;line-height:1.5;">Contenido de alto valor sobre el mercado de alquileres y las tendencias 2026.</p>
      </td>
    </tr>
    <tr>
      <td width="50%" style="background:#F8F8F8;border-left:4px solid #D0021B;padding:16px 18px;border-radius:4px;vertical-align:top;">
        <p style="margin:0;font-size:15px;color:#414042;font-family:Arial,sans-serif;font-weight:700;">🚀 Novedades Finaer 2026</p>
        <p style="margin:6px 0 0;font-size:13px;color:#666666;font-family:Arial,sans-serif;line-height:1.5;">Conocé los nuevos productos, condiciones y diferenciales para este año.</p>
      </td>
      <td width="50%" style="background:#F8F8F8;border-left:4px solid #D0021B;padding:16px 18px;border-radius:4px;vertical-align:top;">
        <p style="margin:0;font-size:15px;color:#414042;font-family:Arial,sans-serif;font-weight:700;">📍 Venue Premium</p>
        <p style="margin:6px 0 0;font-size:13px;color:#666666;font-family:Arial,sans-serif;line-height:1.5;">Sofitel Luxury Hotels · Salón Le Dôme · Cardales. Entrada libre y gratuita.</p>
      </td>
    </tr>
  </table>
</div>`.trim();

const footerHtml = `
<div style="background:#414042;color:#ffffff;padding:24px 32px;text-align:center;">
  <img src="${LOGO_URL}" alt="Finaer" style="height:34px;width:auto;filter:brightness(0) invert(1);display:block;margin:0 auto 10px;">
  <p style="margin:0;font-size:12px;color:#cccccc;font-family:Arial,sans-serif;">© 2026 Finaer · Garantías para alquilar</p>
  <p style="margin:5px 0 0;font-size:12px;font-family:Arial,sans-serif;">
    <a href="https://www.finaersa.com.ar" style="color:#F5C518;text-decoration:none;">www.finaersa.com.ar</a>
  </p>
</div>`.trim();

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Obteniendo estructura base...');
  const basePage = await apiRequest('GET', '/cms/v3/pages/landing-pages/229990531264');
  const ls = JSON.parse(JSON.stringify(basePage.layoutSections));

  // Map widget name → HTML content / form config
  const richContent = {
    'widget_1745254113596': headerHtml,
    'widget_1745255776476': heroHtml,
    'widget_1745255805864': formHeaderHtml,
    'widget_1745254160831': whyHtml,
    'widget_1745255070582': footerHtml
  };

  function updateWidgets(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.name && obj.params) {
      if (richContent[obj.name]) {
        obj.params.richTextContentHTML = richContent[obj.name];
      }
      if (obj.name === 'widget_1745253208703' && obj.params.form) {
        obj.params.form.form_id = FORM_ID;
        obj.params.form.response_type = 'inline';
        obj.params.form.message = '<div style="text-align:center;padding:28px 20px;font-family:Arial,sans-serif;"><h2 style="color:#414042;font-size:22px;margin:0 0 10px;">Registro confirmado 🎉</h2><p style="color:#666;font-size:15px;margin:0 0 8px;">Te esperamos el <strong>13 de Abril</strong><br>en el <strong>Sofitel Le Dôme · Cardales</strong></p><p style="color:#999;font-size:12px;margin:0;">Revisá tu correo para más información.</p></div>';
        delete obj.params.form.redirect_url;
      }
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
    htmlTitle: 'SINOR 2026 · Registro | Finaer - Garantías para alquilar',
    metaDescription: 'Registrate al SINOR 2026 — Salón Inmobiliario Corredor Norte. 13 de Abril, Sofitel Le Dôme, Cardales. Entrada libre y gratuita. Inscripción obligatoria.',
    language: 'es',
    contentTypeCategory: 1,
    currentState: 'DRAFT',
    layoutSections: ls
  };

  console.log('Creando landing SINOR 2026...');
  const landing = await apiRequest('POST', '/cms/v3/pages/landing-pages', landingBody);

  if (landing.id) {
    console.log('');
    console.log('✅ LANDING CREADA EN DRAFT');
    console.log('   ID:      ' + landing.id);
    console.log('   Slug:    ' + landing.slug);
    console.log('   Editor:  https://app-eu1.hubspot.com/pages/145725856/editor/' + landing.id + '/content');
    console.log('   Form ID: ' + FORM_ID);
  } else {
    console.log('ERROR landing:', JSON.stringify(landing).slice(0,400));
  }
}
run().catch(console.error);
