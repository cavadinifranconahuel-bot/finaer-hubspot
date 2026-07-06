// buscar landing humand y propiedad turno_capacitacion_humand
const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
async function main() {
  const fetch = (await import('node-fetch')).default;
  const h = { 'Authorization': `Bearer ${TOKEN}` };

  // Landing
  const lpRes  = await fetch('https://api.hubapi.com/cms/v3/pages/landing-pages?slug=capacitacion-humand&limit=5', { headers: h });
  const lpData = await lpRes.json();
  console.log('Landing results:');
  (lpData.results || []).forEach(lp => console.log(`  ID: ${lp.id} | ${lp.name} | ${lp.slug} | ${lp.url}`));

  // Propiedad turno_capacitacion_humand
  const propRes  = await fetch('https://api.hubapi.com/crm/v3/properties/contacts/turno_capacitacion_humand', { headers: h });
  const propData = await propRes.json();
  console.log(`\nPropiedad: ${propData.name} | tipo: ${propData.type} | fieldType: ${propData.fieldType}`);
  console.log('Opciones actuales:');
  (propData.options || []).forEach(o => console.log(`  ${o.value} → ${o.label}`));
}
main().catch(e => { console.error(e); process.exit(1); });
