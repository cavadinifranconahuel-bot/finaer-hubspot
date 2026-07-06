// ver_estructura_landing_eventos.js
const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const LP_ID = '366631027916';

async function main() {
  const fetch = (await import('node-fetch')).default;
  const h = { 'Authorization': `Bearer ${TOKEN}` };

  const res  = await fetch(`https://api.hubapi.com/cms/v3/pages/landing-pages/${LP_ID}`, { headers: h });
  const lp   = await res.json();

  // Guardar el JSON completo para inspeccionarlo
  const fs = require('fs');
  fs.writeFileSync('landing_eventos_full.json', JSON.stringify(lp, null, 2));
  console.log('JSON completo guardado en landing_eventos_full.json');

  // Mostrar estructura del dnd_area
  const sections = lp.layoutSections || {};
  for (const [sectionKey, section] of Object.entries(sections)) {
    console.log(`\nSECTION: ${sectionKey}`);
    const rows = section.rows || [];
    rows.forEach((row, ri) => {
      (row.cells || []).forEach((cell, ci) => {
        (cell.widgets || []).forEach(w => {
          const type  = w.type || '';
          const label = w.label || w.name || '';
          // Mostrar campos relevantes según el tipo
          const params = w.params || {};
          if (type === 'rich_text' || type === 'module') {
            const html = params.html || params.body || params.content || '';
            console.log(`  [ROW ${ri} CELL ${ci}] ${type} "${label}" → ${html.substring(0, 150).replace(/\n/g, ' ')}`);
          }
          if (params.form_id || params.form_guid) {
            console.log(`  [ROW ${ri} CELL ${ci}] FORM widget "${label}" → form_id: ${params.form_id || params.form_guid}`);
          }
        });
      });
    });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
