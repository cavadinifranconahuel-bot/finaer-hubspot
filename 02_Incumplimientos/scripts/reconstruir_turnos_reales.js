// reconstruir_turnos_reales.js
// Cruza historial de recursos_inscribir_humand + turno_capacitacion_humand
// por timestamp para saber qué recursos corresponden a qué turno REALMENTE
// Luego recalcula el conteo por turno y regenera el CSV correcto.

const fs    = require('fs');
const path  = require('path');
const TOKEN = process.env.HUBSPOT_TOKEN;
const OUTPUT = path.join(__dirname, '..', '..', '06_RRHH-Capacitacion-Humand', 'inscripciones_humand_29jun_final.csv');

const TURNO_LABEL = {
  jueves_2_julio:  'jueves 2 de julio',
  viernes_3_julio: 'viernes 3 de julio',
  lunes_6_julio:   'lunes 6 de julio',
  martes_7_julio:  'martes 7 de julio',
};
const TURNO_ORDER = ['jueves_2_julio', 'viernes_3_julio', 'lunes_6_julio', 'martes_7_julio', null];

function normalize(val) {
  return (val || '').split(';').map(r => r.trim().toLowerCase()).filter(Boolean);
}

async function getFullHistory(fetch, contactId) {
  const res = await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}` +
    `?propertiesWithHistory=recursos_inscribir_humand,turno_capacitacion_humand`,
    { headers: { 'Authorization': `Bearer ${TOKEN}` } }
  );
  const data = await res.json();
  const recursos = data.propertiesWithHistory?.recursos_inscribir_humand || [];
  const turnos   = data.propertiesWithHistory?.turno_capacitacion_humand  || [];
  return { recursos, turnos };
}

async function searchAll(fetch) {
  let all = [], after = null;
  while (true) {
    const body = {
      filterGroups: [{ filters: [{ propertyName: 'recursos_acumulados_humand', operator: 'HAS_PROPERTY' }] }],
      properties: ['firstname', 'lastname', 'email', 'turno_capacitacion_humand'],
      limit: 100, ...(after ? { after } : {})
    };
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    all = all.concat(data.results || []);
    if (!data.paging?.next?.after) break;
    after = data.paging.next.after;
  }
  return all;
}

async function main() {
  const fetch = (await import('node-fetch')).default;
  const all   = await searchAll(fetch);
  console.log(`Líderes: ${all.length}`);

  const rows = [];
  const porTurno = {};
  const lideresMturnos = []; // líderes que usaron más de un turno

  for (const c of all) {
    const p      = c.properties;
    const email  = p.email || '';
    const nombre = [p.firstname, p.lastname].filter(Boolean).join(' ') || email;

    const { recursos: rHist, turnos: tHist } = await getFullHistory(fetch, c.id);

    // Ordenar por timestamp ascendente (el más antiguo primero)
    const rSorted = [...rHist].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const tSorted = [...tHist].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (rSorted.length === 0) continue;

    // Para cada envío de recursos, encontrar el turno más cercano por timestamp
    // (mismo timestamp o el turno inmediatamente anterior/posterior)
    const lotes = rSorted.map((r, i) => {
      const ts = new Date(r.timestamp).getTime();
      // Buscar el turno con timestamp más próximo a este envío (dentro de ±5 segundos)
      let turnoDelLote = null;
      let menorDif = Infinity;
      for (const t of tSorted) {
        const dif = Math.abs(new Date(t.timestamp).getTime() - ts);
        if (dif < menorDif) {
          menorDif = dif;
          turnoDelLote = t.value;
        }
      }
      return { recursos: normalize(r.value), turno: turnoDelLote, timestamp: r.timestamp };
    });

    // Detectar si usó más de un turno
    const turnosUnicos = [...new Set(lotes.map(l => l.turno))];
    if (turnosUnicos.length > 1) {
      lideresMturnos.push({ nombre, email, lotes });
    }

    // Generar filas del CSV por lote (turno correcto para cada grupo de recursos)
    for (const lote of lotes) {
      const turnoKey   = lote.turno;
      const turnoLabel = TURNO_LABEL[turnoKey] || 'Sin turno asignado';

      for (const recurso of lote.recursos) {
        const esEmail = recurso.includes('@');
        rows.push({
          turnoOrder: TURNO_ORDER.indexOf(turnoKey) === -1 ? 99 : TURNO_ORDER.indexOf(turnoKey),
          liderEmail: email,
          liderNombre: nombre,
          turnoLabel,
          turnoKey,
          recurso,
          obs: !esEmail ? 'Revisar — valor no es email' : ''
        });
      }

      // Conteo por turno
      if (!porTurno[turnoKey]) porTurno[turnoKey] = new Set();
      lote.recursos.filter(r => r.includes('@')).forEach(r => porTurno[turnoKey].add(r));
    }
  }

  // Deduplicar recursos dentro del mismo turno
  // (un recurso puede aparecer en dos lotes distintos del mismo líder)
  const seen = new Set();
  const rowsDedup = rows.filter(r => {
    if (!r.recurso.includes('@')) return true; // mantener no-emails para revisión
    const key = `${r.turnoKey}|${r.recurso}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Ordenar
  rowsDedup.sort((a, b) => {
    if (a.turnoOrder !== b.turnoOrder) return a.turnoOrder - b.turnoOrder;
    return a.liderEmail.localeCompare(b.liderEmail);
  });

  // CSV
  const header = 'Lider,Correo del lider,Capacitacion,Recurso interno,Observaciones';
  const lines  = rowsDedup.map(r =>
    `${r.liderNombre},${r.liderEmail},${r.turnoLabel},${r.recurso},${r.obs}`
  );
  fs.writeFileSync(OUTPUT, [header, ...lines].join('\n'), 'utf8');

  // Resumen por turno
  console.log('\n=== CONTEO REAL POR TURNO ===');
  for (const [t, set] of Object.entries(porTurno)) {
    const label = TURNO_LABEL[t] || t;
    const flag  = set.size > 30 ? ' ⚠️  SUPERA 30' : '';
    console.log(`${label}: ${set.size} personas únicas${flag}`);
  }

  // Líderes con múltiples turnos
  if (lideresMturnos.length > 0) {
    console.log('\n=== LÍDERES QUE USARON MÁS DE UN TURNO ===');
    lideresMturnos.forEach(l => {
      console.log(`\n${l.nombre} (${l.email}):`);
      l.lotes.forEach(lote => {
        console.log(`  [${new Date(lote.timestamp).toLocaleString('es-AR')}] ${TURNO_LABEL[lote.turno] || lote.turno}: ${lote.recursos.join(', ')}`);
      });
    });
  } else {
    console.log('\n=== NINGÚN OTRO LÍDER USÓ MÁS DE UN TURNO ===');
  }

  console.log(`\nCSV final: ${OUTPUT}`);
  console.log(`Total filas: ${lines.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
