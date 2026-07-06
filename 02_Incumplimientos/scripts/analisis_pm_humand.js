// analisis_pm_humand.js — responde los 4 puntos de la PM

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';

async function search(fetch, after = null) {
  const body = {
    filterGroups: [{ filters: [{ propertyName: 'recursos_acumulados_humand', operator: 'HAS_PROPERTY' }] }],
    properties: ['firstname', 'lastname', 'email', 'turno_capacitacion_humand', 'recursos_acumulados_humand', 'recursos_inscribir_humand'],
    limit: 100,
    ...(after ? { after } : {})
  };
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function buscarContacto(fetch, email) {
  const body = {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
    properties: ['firstname', 'lastname', 'email', 'turno_capacitacion_humand', 'recursos_acumulados_humand', 'recursos_inscribir_humand'],
    limit: 1
  };
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return data.results?.[0] || null;
}

async function getHistory(fetch, contactId) {
  const res = await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?propertiesWithHistory=recursos_inscribir_humand`,
    { headers: { 'Authorization': `Bearer ${TOKEN}` } }
  );
  const data = await res.json();
  return data.propertiesWithHistory?.recursos_inscribir_humand || [];
}

function normalize(val) {
  return (val || '').split(';').map(r => r.trim().toLowerCase()).filter(r => r.includes('@'));
}

async function main() {
  const fetch = (await import('node-fetch')).default;

  // Traer todos los líderes
  let all = [];
  let after = null;
  while (true) {
    const data = await search(fetch, after);
    all = all.concat(data.results || []);
    if (!data.paging?.next?.after) break;
    after = data.paging.next.after;
  }

  // ── PUNTO 1: Hernan y las fechas ──────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('PUNTO 1 — HERNAN Y LOS TURNOS');
  console.log('════════════════════════════════════════');
  const hernan = all.find(c => c.properties.email === 'hblanco@finaersa.com.ar');
  if (hernan) {
    const hist = await getHistory(fetch, hernan.id);
    console.log(`Turno registrado en HubSpot: ${hernan.properties.turno_capacitacion_humand || '(ninguno)'}`);
    console.log(`Cantidad de envíos del formulario: ${hist.length}`);
    hist.forEach((h, i) => {
      console.log(`  Envío ${i+1} [${h.timestamp}]: turno="${h.value?.split(';')[0]}" | recursos="${h.value?.substring(0, 80)}"`);
    });
    console.log(`Recursos acumulados (${normalize(hernan.properties.recursos_acumulados_humand).length}): ${hernan.properties.recursos_acumulados_humand}`);
  }

  // ── PUNTO 2: Conteo por turno ─────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('PUNTO 2 — RECURSOS POR TURNO');
  console.log('════════════════════════════════════════');
  const porTurno = {};
  const recursosPorTurno = {}; // email único por turno

  for (const c of all) {
    const turno    = c.properties.turno_capacitacion_humand || 'sin_turno';
    const recursos = normalize(c.properties.recursos_acumulados_humand);
    if (!porTurno[turno]) { porTurno[turno] = { lideres: 0, recursos: [] }; }
    porTurno[turno].lideres++;
    porTurno[turno].recursos.push(...recursos);
    if (!recursosPorTurno[turno]) recursosPorTurno[turno] = new Set();
    recursos.forEach(r => recursosPorTurno[turno].add(r));
  }

  const turnoLabel = {
    jueves_2_julio: 'Jueves 2/7',
    viernes_3_julio: 'Viernes 3/7',
    lunes_6_julio: 'Lunes 6/7',
    martes_7_julio: 'Martes 7/7',
    sin_turno: 'Sin turno'
  };
  for (const [t, info] of Object.entries(porTurno)) {
    const unicos = recursosPorTurno[t].size;
    const flag   = unicos > 30 ? ' ⚠️  SUPERA 30' : '';
    console.log(`${turnoLabel[t] || t}: ${unicos} personas únicas (${info.lideres} líderes)${flag}`);
    if (unicos > 30) {
      console.log(`  Recursos: ${[...recursosPorTurno[t]].join(', ')}`);
    }
  }

  // ── PUNTO 3: Verónica Rodríguez ───────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('PUNTO 3 — VERÓNICA RODRÍGUEZ');
  console.log('════════════════════════════════════════');
  // Buscar por email principal
  const vrojas = await buscarContacto(fetch, 'vrojas@finaersa.com.ar');
  const vrodriguez = await buscarContacto(fetch, 'vrodriguez@finaersa.com.ar');

  for (const [label, c] of [['vrojas@finaersa.com.ar', vrojas], ['vrodriguez@finaersa.com.ar', vrodriguez]]) {
    if (!c) { console.log(`${label}: NO encontrado en HubSpot`); continue; }
    const hist = await getHistory(fetch, c.id);
    console.log(`\n${label} — ${c.properties.firstname} ${c.properties.lastname}`);
    console.log(`  turno: ${c.properties.turno_capacitacion_humand || '(sin turno)'}`);
    console.log(`  recursos_inscribir_humand: ${c.properties.recursos_inscribir_humand || '(vacío)'}`);
    console.log(`  recursos_acumulados_humand: ${c.properties.recursos_acumulados_humand || '(vacío)'}`);
    console.log(`  Envíos del formulario: ${hist.length}`);
    hist.forEach((h, i) => console.log(`    Envío ${i+1} [${h.timestamp}]: ${h.value?.substring(0, 100)}`));
  }

  // ── PUNTO 4: Total de personas únicas y quiénes no están ─────────────────
  console.log('\n════════════════════════════════════════');
  console.log('PUNTO 4 — TOTAL DE PERSONAS ÚNICAS INSCRIPTAS');
  console.log('════════════════════════════════════════');
  const todasLasPersonas = new Set();
  for (const c of all) {
    normalize(c.properties.recursos_acumulados_humand).forEach(r => todasLasPersonas.add(r));
  }
  console.log(`Total personas únicas inscriptas (con email válido): ${todasLasPersonas.size}`);

  // Buscar líderes que no inscribieron recursos (solo se pusieron a sí mismos)
  console.log('\nLíderes con solo 1 recurso (probablemente solo se auto-inscribieron):');
  all.forEach(c => {
    const recursos = normalize(c.properties.recursos_acumulados_humand);
    if (recursos.length === 1) {
      const nombre = [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ') || c.properties.email;
      console.log(`  ${nombre} (${c.properties.email}): solo inscribió ${recursos[0]}`);
    }
  });
}

main().catch(e => { console.error(e); process.exit(1); });
