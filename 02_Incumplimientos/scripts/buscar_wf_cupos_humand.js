// buscar_wf_cupos_humand.js — busca WFs relacionados a Humand/cupos
const TOKEN = process.env.HUBSPOT_TOKEN;

async function main() {
  const fetch = (await import('node-fetch')).default;
  const res  = await fetch('https://api.hubapi.com/automation/v4/flows?limit=50', {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  const data = await res.json();

  const wfs = (data.results || []).filter(w =>
    /humand|cupo|capacit|inscri/i.test(w.name)
  );

  if (wfs.length === 0) {
    console.log('No se encontraron WFs con esos términos. Listando todos:');
    (data.results || []).forEach(w =>
      console.log(`  ID: ${w.id} | ${w.name} | activo: ${w.isEnabled}`)
    );
  } else {
    wfs.forEach(w => {
      console.log(`\nID: ${w.id}`);
      console.log(`Nombre: ${w.name}`);
      console.log(`Activo: ${w.isEnabled}`);
      console.log(`Tipo: ${w.type}`);
      // Buscar si tiene acción de email/notificación
      const actions = w.actions || [];
      actions.forEach(a => console.log(`  Acción: ${a.type} ${a.actionTypeId || ''}`));
    });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
