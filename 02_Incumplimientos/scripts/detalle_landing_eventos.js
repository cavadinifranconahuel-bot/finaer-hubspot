// detalle_landing_eventos.js
// Muestra el contenido completo de la landing y los campos del form actual y del pedido

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const LP_ID = '366631027916';

// Form "Adhesión Eventos" — el que parece estar en la landing actualmente
const FORM_ACTUAL_ID  = '6cbbbf24-440d-4fb5-99b4-7edecf443d87';

async function getFormFields(fetch, formId) {
  const res  = await fetch(`https://api.hubapi.com/marketing/v3/forms/${formId}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  const data = await res.json();
  const fields = (data.fieldGroups || []).flatMap(g => g.fields || []);
  return { name: data.name, fields };
}

async function main() {
  const fetch = (await import('node-fetch')).default;
  const h = { 'Authorization': `Bearer ${TOKEN}` };

  // 1. Landing page completa
  console.log('=== LANDING PAGE COMPLETA ===');
  const lpRes  = await fetch(`https://api.hubapi.com/cms/v3/pages/landing-pages/${LP_ID}`, { headers: h });
  const lp     = await lpRes.json();

  console.log(`Nombre:  ${lp.name}`);
  console.log(`Slug:    ${lp.slug}`);
  console.log(`Estado:  ${lp.state}`);
  console.log(`headHtml:\n${lp.headHtml || '(vacío)'}`);
  console.log(`\nfooterHtml (primeros 2000 chars):\n${(lp.footerHtml || '').substring(0, 2000)}`);

  // Buscar texto y form en el layoutSections / widgets
  const body = lp.layoutSections || {};
  const bodyStr = JSON.stringify(body);
  // Extraer form_id de los widgets
  const formMatches = [...bodyStr.matchAll(/"form_id":"([^"]+)"/g)];
  const formGuids   = [...new Set(formMatches.map(m => m[1]))];
  console.log(`\nForm GUID(s) embebidos en la landing: ${formGuids.join(', ') || '(ninguno encontrado en layoutSections)'}`);

  // Extraer texto rico si existe
  const textMatches = [...bodyStr.matchAll(/"body":"([^"]{10,200})"/g)];
  if (textMatches.length) {
    console.log('\nFragmentos de texto encontrados en widgets:');
    textMatches.slice(0, 5).forEach(m => console.log(' -', m[1]));
  }

  // 2. Form actual
  console.log('\n=== FORM ACTUAL (Adhesión Eventos) ===');
  const fa = await getFormFields(fetch, FORM_ACTUAL_ID);
  console.log(`Nombre: ${fa.name}`);
  fa.fields.forEach(f => {
    const opts = f.options?.map(o => o.label).join(' / ') || '';
    console.log(`  [${f.fieldType || f.inputType}] ${f.label || f.name}${f.required ? ' *' : ''}${opts ? ' → ' + opts : ''}`);
  });

  // 3. Todos los forms que puedan ser el pedido (los que tienen más de 4 campos y nombre relevante)
  console.log('\n=== TODOS LOS FORMS CON CAMPOS PARA REVISAR ===');
  const candidatos = [
    'a94e2078-7d39-42e6-a6ca-5a487bb0578b', // Formulario Evento Test (13 campos)
    'ed2a220e-0d3b-4d8d-a84f-13b870540258', // Adhesión (13 campos)
    '5f289291-4310-4385-8302-bf1a2944df63', // Sorteo Alumni Rugby (6 campos)
  ];
  for (const id of candidatos) {
    const f = await getFormFields(fetch, id);
    console.log(`\n[${id}] ${f.name}:`);
    f.fields.forEach(field => {
      const opts = field.options?.map(o => o.label).join(' / ') || '';
      console.log(`  [${field.fieldType || field.inputType}] ${field.label || field.name}${field.required ? ' *' : ''}${opts ? ' → ' + opts : ''}`);
    });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
