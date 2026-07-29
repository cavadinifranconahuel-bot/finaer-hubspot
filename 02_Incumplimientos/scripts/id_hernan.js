const TOKEN = process.env.HUBSPOT_TOKEN;
async function main() {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: 'hblanco@finaersa.com.ar' }] }],
      properties: ['firstname', 'lastname', 'email', 'turno_capacitacion_humand', 'recursos_inscribir_humand'],
      limit: 1
    })
  });
  const data = await res.json();
  const c = data.results?.[0];
  if (c) {
    console.log(`ID HubSpot: ${c.id}`);
    console.log(`Nombre: ${c.properties.firstname} ${c.properties.lastname}`);
    console.log(`Turno: ${c.properties.turno_capacitacion_humand}`);
    console.log(`URL: https://app-eu1.hubspot.com/contacts/145725856/contact/${c.id}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
