// fix_logo_landings.js
// Inyecta el logo SVG de FINAER en las landings de Incumplimientos donde se rompió.
// Actualiza headHtml via PATCH draft → publish.
//
// Landings a actualizar:
//   430264653040 → Incumplimiento - Nuevo forms (PUBLISHED)
//   467413433582 → Incumplimiento - Nuevo forms (clon 2) (DRAFT)

require('dotenv').config();

const TOKEN = process.env.HUBSPOT_TOKEN;
if (!TOKEN) { console.error('HUBSPOT_TOKEN no definido en .env'); process.exit(1); }

const BASE  = 'https://api.hubapi.com/cms/v3/pages/landing-pages';
const H     = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

// ── SVG del logo FINAER ──────────────────────────────────────────────────────
// Recreado desde el logo oficial. Fuente: Arial Rounded MT Bold (disponible en Windows).
// Colores oficiales: #4a4a49 (gris oscuro), #e30613 (rojo FINAER).
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 76" role="img" aria-label="Finaer — Garantías para alquilar">
  <text x="2" y="57" style="font:900 62px 'Arial Rounded MT Bold',Arial,sans-serif;fill:#4a4a49;letter-spacing:-.5px">Finaer</text>
  <path d="M164 5 L178 25 L192 5" style="fill:none;stroke:#e30613;stroke-width:8;stroke-linecap:round;stroke-linejoin:round"/>
  <text x="30" y="72" style="font:14px Arial,sans-serif">
    <tspan style="fill:#e30613;font-style:italic">Garantías</tspan><tspan style="fill:#4a4a49"> para alquilar</tspan>
  </text>
</svg>`;

const LOGO_URI = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOGO_SVG);

// ── Script a inyectar en headHtml ────────────────────────────────────────────
const FIX_SCRIPT = `
<!-- FINAER logo fix — inyectado automáticamente -->
<script>
(function() {
  var URI = ${JSON.stringify(LOGO_URI)};
  function applyLogo(img) {
    img.onerror = null;
    img.src = URI;
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

// ── Helpers API ───────────────────────────────────────────────────────────────
async function getLanding(id) {
  const r = await fetch(`${BASE}/${id}`, { headers: H });
  return r.json();
}

async function patchDraft(id, headHtml) {
  const r = await fetch(`${BASE}/${id}/draft`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({ headHtml })
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`PATCH draft ${id} → ${r.status}: ${t}`);
  }
  return r.json();
}

async function publishDraft(id) {
  const r = await fetch(`${BASE}/${id}/draft/push-live`, {
    method: 'POST',
    headers: H
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`push-live ${id} → ${r.status}: ${t}`);
  }
  return r.status;
}

// ── Procesar landing ──────────────────────────────────────────────────────────
const TAG_START = '<!-- FINAER logo fix';
const TAG_END   = '</script>';

async function fixLanding(id, shouldPublish) {
  const page = await getLanding(id);
  console.log(`\n[${id}] ${page.name} (${page.currentState || page.state})`);

  let headHtml = page.headHtml || '';

  // Si ya tiene el fix, lo reemplaza para actualizar el SVG
  if (headHtml.includes(TAG_START)) {
    const startIdx = headHtml.indexOf(TAG_START);
    const endIdx   = headHtml.indexOf(TAG_END, startIdx) + TAG_END.length;
    headHtml = headHtml.substring(0, startIdx).trimEnd() + FIX_SCRIPT;
    console.log('  → Fix existente actualizado');
  } else {
    headHtml = headHtml.trimEnd() + '\n' + FIX_SCRIPT;
    console.log('  → Fix inyectado por primera vez');
  }

  await patchDraft(id, headHtml);
  console.log('  → Draft actualizado ✓');

  if (shouldPublish) {
    const status = await publishDraft(id);
    console.log(`  → Publicado (HTTP ${status}) ✓`);
  } else {
    console.log('  → Queda en DRAFT (no era página publicada)');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('Actualizando logo FINAER en landings de Incumplimientos...\n');
  try {
    await fixLanding('430264653040', true);   // PUBLISHED → actualizar y publicar
    await fixLanding('467413433582', false);  // DRAFT → solo actualizar draft
    console.log('\n✅ Listo. Abrí las landings en HubSpot para verificar el logo.');
  } catch (e) {
    console.error('\n❌ Error:', e.message);
  }
})();
