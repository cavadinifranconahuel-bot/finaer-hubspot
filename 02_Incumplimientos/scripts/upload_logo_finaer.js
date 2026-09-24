// upload_logo_finaer.js
// Extrae el PNG del SVG del logo FINAER, lo sube a HubSpot Files,
// y actualiza las landings de Incumplimientos con la URL real.

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const TOKEN = process.env.HUBSPOT_TOKEN;
if (!TOKEN) { console.error('HUBSPOT_TOKEN no definido en .env'); process.exit(1); }

const SVG_PATH = path.join('C:\\Users\\Usuario\\Downloads', 'finaer_logo_garantias.svg');
const BASE_LP  = 'https://api.hubapi.com/cms/v3/pages/landing-pages';
const H_JSON   = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

// ── 1. Extraer PNG del SVG ────────────────────────────────────────────────────
function extraerPNG(svgPath) {
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const match = svgContent.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
  if (!match) throw new Error('No se encontró PNG embebido en el SVG');
  return Buffer.from(match[1], 'base64');
}

// ── 2. Subir a HubSpot Files v3 ───────────────────────────────────────────────
async function subirArchivo(pngBuffer) {
  const { FormData, Blob } = require('buffer') in globalThis ? globalThis : await import('node:buffer').catch(() => ({}));

  // FormData nativa de Node 18+
  const form = new global.FormData ? new global.FormData() : (() => {
    throw new Error('FormData no disponible — requiere Node 18+');
  })();

  const blob = new Blob([pngBuffer], { type: 'image/png' });
  form.append('file', blob, 'logo-finaer.png');
  form.append('options', JSON.stringify({
    access: 'PUBLIC_INDEXABLE',
    overwrite: true
  }));
  form.append('folderPath', '/logos');

  const r = await fetch('https://api.hubapi.com/files/v3/files', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    body: form
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Upload fallido: ${r.status} ${t}`);
  }
  const data = await r.json();
  return data.url || data.cdn_url || data.objects?.[0]?.url;
}

// ── 3. Actualizar headHtml de una landing ────────────────────────────────────
const TAG_START = '<!-- FINAER logo fix';
const TAG_END   = '</script>';

async function actualizarLanding(id, logoUrl, shouldPublish) {
  const r = await fetch(`${BASE_LP}/${id}`, { headers: H_JSON });
  const page = await r.json();
  console.log(`\n[${id}] ${page.name}`);

  // Reemplazar src roto con la URL real del logo subido
  const fixScript = `
<!-- FINAER logo fix — logo real subido a HubSpot Files -->
<script>
(function() {
  var LOGO_URL = ${JSON.stringify(logoUrl)};
  function applyLogo(img) {
    img.onerror = null;
    img.src = LOGO_URL;
    img.style.maxHeight = '52px';
    img.style.height = 'auto';
    img.style.width = 'auto';
  }
  function patchAll() {
    document.querySelectorAll('img').forEach(function(img) {
      if (!img.src || !/logo|finaer/i.test(img.src)) return;
      if (img.complete && img.naturalWidth === 0) { applyLogo(img); return; }
      img.addEventListener('error', function() { applyLogo(this); }, { once: true });
    });
  }
  document.addEventListener('DOMContentLoaded', function() { patchAll(); setTimeout(patchAll, 800); });
  window.addEventListener('load', patchAll);
})();
<\/script>`;

  let headHtml = page.headHtml || '';
  if (headHtml.includes(TAG_START)) {
    const startIdx = headHtml.indexOf(TAG_START);
    const endIdx   = headHtml.indexOf(TAG_END, startIdx) + TAG_END.length;
    headHtml = headHtml.substring(0, startIdx).trimEnd() + fixScript;
    console.log('  → Fix actualizado con URL real');
  } else {
    headHtml = headHtml.trimEnd() + '\n' + fixScript;
    console.log('  → Fix inyectado con URL real');
  }

  const patch = await fetch(`${BASE_LP}/${id}/draft`, {
    method: 'PATCH',
    headers: H_JSON,
    body: JSON.stringify({ headHtml })
  });
  if (!patch.ok) throw new Error(`PATCH draft ${id} → ${patch.status}`);
  console.log('  → Draft actualizado ✓');

  if (shouldPublish) {
    const pub = await fetch(`${BASE_LP}/${id}/draft/push-live`, {
      method: 'POST', headers: H_JSON
    });
    console.log(`  → Publicado (HTTP ${pub.status}) ✓`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('Extrayendo PNG del SVG...');
  const pngBuffer = extraerPNG(SVG_PATH);
  console.log(`PNG extraído: ${(pngBuffer.length / 1024).toFixed(1)} KB`);

  console.log('\nSubiendo a HubSpot Files...');
  const logoUrl = await subirArchivo(pngBuffer);
  console.log('URL del logo:', logoUrl);

  console.log('\nActualizando landings...');
  await actualizarLanding('430264653040', logoUrl, true);   // PUBLISHED
  await actualizarLanding('467413433582', logoUrl, false);  // DRAFT

  console.log('\n✅ Listo. Logo real publicado en las landings.');
})();
