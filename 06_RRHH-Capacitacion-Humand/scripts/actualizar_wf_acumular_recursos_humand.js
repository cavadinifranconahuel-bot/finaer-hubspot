// actualizar_wf_acumular_recursos_humand.js
// Actualiza WF 4487217376 "Humand — Acumular Recursos" via Automation API v4
// node actualizar_wf_acumular_recursos_humand.js

const fs   = require('fs');
const path = require('path');

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const WF_ID = '4487217376';

const sourceCode = fs.readFileSync(
  path.join(__dirname, 'wf_acumular_recursos_humand.js'),
  'utf8'
);

async function main() {
  const fetch = (await import('node-fetch')).default;
  const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

  const current = await fetch(`https://api.hubapi.com/automation/v4/flows/${WF_ID}`, { headers: authHeader });
  const currentData = await current.json();
  console.log(`revisionId actual: ${currentData.revisionId} | activo: ${currentData.isEnabled}`);

  // Reemplazar solo el sourceCode e inputFields de la action 2; preservar todo lo demás
  const actions = currentData.actions.map(a => {
    if (a.type !== 'CUSTOM_CODE') return a;
    return {
      ...a,
      sourceCode,
      secretNames: ['token'],
      runtime: 'NODE20X',
      inputFields: [
        { name: 'recursos_inscribir_humand',  value: { propertyName: 'recursos_inscribir_humand',  type: 'OBJECT_PROPERTY' } },
        { name: 'recursos_acumulados_humand', value: { propertyName: 'recursos_acumulados_humand', type: 'OBJECT_PROPERTY' } }
      ],
      outputFields: [{ name: 'resultado', type: 'STRING' }]
    };
  });

  const merged = {
    ...currentData,
    revisionId: String(currentData.revisionId),
    actions
  };

  const res = await fetch(`https://api.hubapi.com/automation/v4/flows/${WF_ID}`, {
    method:  'PUT',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body:    JSON.stringify(merged)
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('ERROR:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`WF actualizado — ID: ${data.id}`);
  console.log(`Nombre:  ${data.name}`);
  console.log(`Activo:  ${data.isEnabled}`);
}

main().catch(e => { console.error(e); process.exit(1); });
