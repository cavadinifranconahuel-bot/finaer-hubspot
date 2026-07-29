// generar_csv_humand_recuperado.js
// Genera CSV desde recursos_acumulados_humand en HubSpot
// Correr desde 02_Incumplimientos/scripts (tiene node_modules)

const fs   = require('fs');
const path = require('path');

const TOKEN  = process.env.HUBSPOT_TOKEN;
const OUTPUT = path.join(__dirname, '..', '..', '06_RRHH-Capacitacion-Humand', 'inscripciones_humand_29jun_recuperado.csv');

const TURNO_LABEL = {
  jueves_2_julio:  'jueves 2 de julio',
  viernes_3_julio: 'viernes 3 de julio',
  lunes_6_julio:   'lunes 6 de julio',
  martes_7_julio:  'martes 7 de julio',
};

const TURNO_ORDER = ['jueves_2_julio', 'viernes_3_julio', 'lunes_6_julio', 'martes_7_julio', null];

async function search(fetch, after = null) {
  const body = {
    filterGroups: [{
      filters: [{
        propertyName: 'recursos_acumulados_humand',
        operator: 'HAS_PROPERTY'
      }]
    }],
    properties: ['firstname', 'lastname', 'email', 'turno_capacitacion_humand', 'recursos_acumulados_humand'],
    limit: 100,
    ...(after ? { after } : {})
  };

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method:  'POST',
    headers: {
      'Authorization':  `Bearer ${TOKEN}`,
      'Content-Type':   'application/json'
    },
    body: JSON.stringify(body)
  });

  return res.json();
}

async function main() {
  const fetch = (await import('node-fetch')).default;

  let all = [];
  let after = null;

  while (true) {
    const data = await search(fetch, after);
    if (data.status === 'error') {
      console.error('API error:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
    all = all.concat(data.results || []);
    console.log(`Obtenidos: ${all.length} / ${data.total}`);
    if (!data.paging?.next?.after) break;
    after = data.paging.next.after;
  }

  console.log(`Total contactos: ${all.length}`);

  // Construir filas
  const rows = [];

  for (const c of all) {
    const p = c.properties;
    const firstname = p.firstname || '';
    const lastname  = p.lastname  || '';
    const email     = p.email     || '';
    const turnoKey  = p.turno_capacitacion_humand || null;
    const recursos  = p.recursos_acumulados_humand || '';

    const liderNombre = [firstname, lastname].filter(Boolean).join(' ') || email;
    const turnoLabel  = TURNO_LABEL[turnoKey] || 'Sin turno asignado';

    const lista = recursos.split(';').map(r => r.trim()).filter(Boolean);

    for (const recurso of lista) {
      const esEmail   = recurso.includes('@');
      const obs       = !esEmail ? 'Revisar — valor no es email' : '';
      rows.push({
        turnoOrder: TURNO_ORDER.indexOf(turnoKey) === -1 ? TURNO_ORDER.length : TURNO_ORDER.indexOf(turnoKey),
        liderEmail: email,
        liderNombre,
        turnoLabel,
        recurso,
        obs
      });
    }
  }

  // Ordenar por turno, luego lider
  rows.sort((a, b) => {
    if (a.turnoOrder !== b.turnoOrder) return a.turnoOrder - b.turnoOrder;
    return a.liderEmail.localeCompare(b.liderEmail);
  });

  // CSV
  const header = 'Lider,Correo del lider,Capacitacion,Recurso interno,Observaciones';
  const lines  = rows.map(r =>
    `${r.liderNombre},${r.liderEmail},${r.turnoLabel},${r.recurso},${r.obs}`
  );

  fs.writeFileSync(OUTPUT, [header, ...lines].join('\n'), 'utf8');
  console.log(`\nCSV generado: ${OUTPUT}`);
  console.log(`Total filas: ${lines.length}`);

  // Resumen por lider
  const porLider = {};
  for (const r of rows) {
    if (!porLider[r.liderEmail]) porLider[r.liderEmail] = { nombre: r.liderNombre, turno: r.turnoLabel, count: 0, sinEmail: 0 };
    porLider[r.liderEmail].count++;
    if (!r.recurso.includes('@')) porLider[r.liderEmail].sinEmail++;
  }

  console.log('\n=== RESUMEN POR LÍDER ===');
  for (const [email, info] of Object.entries(porLider)) {
    const flag = info.sinEmail > 0 ? ` ⚠️  ${info.sinEmail} sin email` : '';
    console.log(`${info.nombre} (${info.turno}): ${info.count} recursos${flag}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
