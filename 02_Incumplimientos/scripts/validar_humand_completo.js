// validar_humand_completo.js — doble check exhaustivo antes de mandar a RRHH
// node validar_humand_completo.js

const TOKEN = process.env.HUBSPOT_TOKEN;

async function search(fetch, after = null) {
  const body = {
    filterGroups: [{
      filters: [{
        propertyName: 'recursos_acumulados_humand',
        operator: 'HAS_PROPERTY'
      }]
    }],
    properties: [
      'firstname', 'lastname', 'email',
      'turno_capacitacion_humand',
      'recursos_inscribir_humand',
      'recursos_acumulados_humand'
    ],
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

async function getHistory(fetch, contactId) {
  const res = await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?propertiesWithHistory=recursos_inscribir_humand`,
    { headers: { 'Authorization': `Bearer ${TOKEN}` } }
  );
  const data = await res.json();
  const hist = data.propertiesWithHistory?.recursos_inscribir_humand || [];
  return hist.map(h => h.value).filter(Boolean);
}

function normalize(val) {
  return val.split(';').map(r => r.trim().toLowerCase()).filter(Boolean);
}

async function main() {
  const fetch = (await import('node-fetch')).default;

  // 1. Traer todos los contactos
  let all = [];
  let after = null;
  while (true) {
    const data = await search(fetch, after);
    if (data.status === 'error') { console.error(JSON.stringify(data)); process.exit(1); }
    all = all.concat(data.results || []);
    if (!data.paging?.next?.after) break;
    after = data.paging.next.after;
  }
  console.log(`\nContactos con recursos_acumulados_humand: ${all.length}\n`);

  const problemas = [];
  const warnings  = [];

  // Mapa: recurso → [líderes que lo inscribieron]
  const recursoALideres = {};

  for (const c of all) {
    const p         = c.properties;
    const id        = c.id;
    const email     = p.email || '';
    const nombre    = [p.firstname, p.lastname].filter(Boolean).join(' ') || email;
    const turno     = p.turno_capacitacion_humand || null;
    const ultimoEnv = p.recursos_inscribir_humand || '';
    const acumulado = p.recursos_acumulados_humand || '';

    const acumList  = normalize(acumulado);
    const ultimoList = normalize(ultimoEnv);

    // CHECK 1: líder sin nombre real en HubSpot
    if (!p.firstname && !p.lastname) {
      problemas.push(`[SIN NOMBRE] ${email} — no tiene firstname/lastname en HubSpot`);
    }

    // CHECK 2: nombre sospechoso (sin arroba, muy corto, o parece texto libre)
    if (p.firstname && p.lastname) {
      const fullName = `${p.firstname} ${p.lastname}`.toLowerCase();
      if (fullName.includes('gsg') || fullName.includes('ddgdsg') || fullName.includes('test')) {
        problemas.push(`[NOMBRE INVÁLIDO] ${email} — nombre en HubSpot: "${p.firstname} ${p.lastname}"`);
      }
    }

    // CHECK 3: sin turno asignado
    if (!turno) {
      warnings.push(`[SIN TURNO] ${nombre} (${email})`);
    }

    // CHECK 4: recursos_acumulados vacío (no debería pasar si tiene la propiedad)
    if (acumList.length === 0) {
      problemas.push(`[ACUMULADO VACÍO] ${nombre} (${email})`);
    }

    // CHECK 5: último envío no está en el acumulado
    // (indicaría que el WF no corrió o falló para el último submit)
    if (ultimoList.length > 0) {
      const faltanEnAcum = ultimoList.filter(r => !acumList.includes(r));
      if (faltanEnAcum.length > 0) {
        problemas.push(`[WF NO ACUMULÓ] ${nombre} (${email}) — último envío tiene recursos que NO están en acumulado: ${faltanEnAcum.join('; ')}`);
      }
    }

    // CHECK 6: recursos sin formato email
    const sinEmail = acumList.filter(r => !r.includes('@'));
    if (sinEmail.length > 0) {
      warnings.push(`[VALOR NO-EMAIL] ${nombre} (${email}) — ${sinEmail.length} valor(es): ${sinEmail.join(' | ')}`);
    }

    // CHECK 7: recursos con email de gmail u otro dominio externo
    const externosList = acumList.filter(r => r.includes('@') && !r.includes('@finaersa.com'));
    if (externosList.length > 0) {
      warnings.push(`[EMAIL EXTERNO] ${nombre} (${email}) — ${externosList.join(' | ')}`);
    }

    // Acumular para check de duplicados entre líderes
    for (const r of acumList) {
      if (!r.includes('@')) continue; // ignorar no-emails para este check
      if (!recursoALideres[r]) recursoALideres[r] = [];
      recursoALideres[r].push({ email, nombre, turno });
    }
  }

  // CHECK 8: recurso inscripto por más de un líder
  console.log('=== PROBLEMAS CRÍTICOS ===');
  if (problemas.length === 0) {
    console.log('Ninguno.');
  } else {
    problemas.forEach(p => console.log('❌ ' + p));
  }

  console.log('\n=== WARNINGS (para revisar manualmente) ===');
  if (warnings.length === 0) {
    console.log('Ninguno.');
  } else {
    warnings.forEach(w => console.log('⚠️  ' + w));
  }

  console.log('\n=== RECURSOS INSCRIPTOS POR MÁS DE UN LÍDER ===');
  const duplicados = Object.entries(recursoALideres).filter(([, lids]) => lids.length > 1);
  if (duplicados.length === 0) {
    console.log('Ninguno.');
  } else {
    duplicados.forEach(([recurso, lids]) => {
      const desc = lids.map(l => `${l.nombre} (${l.turno || 'sin turno'})`).join(' + ');
      console.log(`⚠️  ${recurso} → ${desc}`);
    });
  }

  // CHECK 9: validar con historial — por cada contacto, comparar history vs acumulado
  console.log('\n=== VALIDANDO HISTORIAL vs ACUMULADO (puede tardar un poco) ===');
  let histOk = 0, histFaltan = 0;
  for (const c of all) {
    const p        = c.properties;
    const email    = p.email || c.id;
    const nombre   = [p.firstname, p.lastname].filter(Boolean).join(' ') || email;
    const acumList = normalize(p.recursos_acumulados_humand || '');

    const historicos = await getHistory(fetch, c.id);
    const todoHistorico = [...new Set(historicos.flatMap(v => normalize(v)))];
    const faltanEnAcum  = todoHistorico.filter(r => !acumList.includes(r));

    if (faltanEnAcum.length > 0) {
      histFaltan++;
      console.log(`❌ HISTORIAL INCOMPLETO — ${nombre} (${email}): falta en acumulado → ${faltanEnAcum.join('; ')}`);
    } else {
      histOk++;
    }
  }
  console.log(`\nHistorial OK: ${histOk} | Con faltantes: ${histFaltan}`);

  // Resumen final
  console.log('\n=== RESUMEN FINAL ===');
  console.log(`Total líderes: ${all.length}`);
  console.log(`Problemas críticos: ${problemas.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Recursos duplicados entre líderes: ${duplicados.length}`);
  console.log(`Contactos con historial incompleto: ${histFaltan}`);
}

main().catch(e => { console.error(e); process.exit(1); });
