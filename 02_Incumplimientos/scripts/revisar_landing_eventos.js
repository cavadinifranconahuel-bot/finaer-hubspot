// revisar_landing_eventos.js
// Busca la landing landing-registros-eventos-finaer y el form pedido

const TOKEN = process.env.HUBSPOT_TOKEN;

async function main() {
  const fetch = (await import('node-fetch')).default;
  const h = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  // 1. Buscar la landing page por slug
  console.log('=== LANDING PAGE ===');
  const lpRes = await fetch(
    'https://api.hubapi.com/cms/v3/pages/landing-pages?slug=landing-registros-eventos-finaer&limit=5',
    { headers: h }
  );
  const lpData = await lpRes.json();
  if (lpData.results?.length > 0) {
    const lp = lpData.results[0];
    console.log(`ID: ${lp.id}`);
    console.log(`Nombre: ${lp.name}`);
    console.log(`Slug: ${lp.slug}`);
    console.log(`Estado: ${lp.state}`);
    console.log(`URL: ${lp.url}`);
    console.log(`headHtml (primeros 500 chars):\n${(lp.headHtml || '').substring(0, 500)}`);
    console.log(`\nbodyJson keys: ${Object.keys(lp.layoutSections || {}).join(', ')}`);
  } else {
    console.log('No encontrada por slug, buscando por nombre...');
    const lpRes2 = await fetch(
      'https://api.hubapi.com/cms/v3/pages/landing-pages?name__contains=eventos&limit=10',
      { headers: h }
    );
    const lpData2 = await lpRes2.json();
    (lpData2.results || []).forEach(lp => {
      console.log(`  ID: ${lp.id} | ${lp.name} | ${lp.slug} | ${lp.state}`);
    });
  }

  // 2. Buscar todos los forms y listar los más recientes / relevantes
  console.log('\n=== FORMULARIOS (más recientes) ===');
  const fRes = await fetch(
    'https://api.hubapi.com/marketing/v3/forms/?limit=20&after=0&orderBy=-updatedAt',
    { headers: h }
  );
  const fData = await fRes.json();
  (fData.results || []).forEach(f => {
    console.log(`ID: ${f.id} | ${f.name} | campos: ${f.fieldGroups?.flatMap(g => g.fields).length ?? '?'} | updated: ${f.updatedAt}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
