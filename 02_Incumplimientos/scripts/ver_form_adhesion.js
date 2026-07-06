// ver_form_adhesion.js
const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const FORM_ID = 'ed2a220e-0d3b-4d8d-a84f-13b870540258';

async function main() {
  const fetch = (await import('node-fetch')).default;
  const res   = await fetch(`https://api.hubapi.com/marketing/v3/forms/${FORM_ID}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  const data  = await res.json();
  const fs    = require('fs');
  fs.writeFileSync('form_adhesion_raw.json', JSON.stringify(data, null, 2));
  console.log('JSON completo guardado en form_adhesion_raw.json');

  // Mostrar campos clave
  console.log(`\nNombre: ${data.name}`);
  console.log(`SubType: ${data.formType}`);
  console.log(`displayOptions:`);
  console.log(JSON.stringify(data.displayOptions, null, 2));
  console.log(`\nconfiguration:`);
  console.log(JSON.stringify(data.configuration, null, 2));
  console.log(`\nlegalConsentOptions:`);
  console.log(JSON.stringify(data.legalConsentOptions, null, 2));
  console.log(`\nsubmitButtonText: ${data.submitButtonText}`);
  console.log(`\nFields:`);
  (data.fieldGroups || []).flatMap(g => g.fields || []).forEach(f => {
    console.log(`  [${f.fieldType}] ${f.label} | name: ${f.name}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
