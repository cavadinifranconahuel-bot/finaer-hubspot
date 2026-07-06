// reporte_humand_fechas.js — CSV con fechas exactas + resumen por fecha
const fs   = require('fs');
const path = require('path');

const INPUT  = path.join(__dirname, '..', '..', '06_RRHH-Capacitacion-Humand', 'inscripciones_humand_29jun_final.csv');
const OUTPUT = INPUT; // sobreescribe el mismo archivo

const FECHA = {
  'jueves 2 de julio':  '02/07/2026',
  'viernes 3 de julio': '03/07/2026',
  'lunes 6 de julio':   '06/07/2026',
  'martes 7 de julio':  '07/07/2026',
  'Sin turno asignado': 'Sin fecha asignada'
};

const raw   = fs.readFileSync(INPUT, 'utf8');
const lines = raw.split('\n').filter(l => l.trim());

const header = lines[0];
const rows   = lines.slice(1);

// Limpiar filas con "Revisar — valor no es email" y reemplazar fechas
const limpias = rows
  .filter(r => !r.includes('Revisar — valor no es email'))
  .map(r => {
    for (const [label, fecha] of Object.entries(FECHA)) {
      r = r.replace(label, fecha);
    }
    return r;
  });

// Guardar CSV actualizado
fs.writeFileSync(OUTPUT, [header, ...limpias].join('\n'), 'utf8');
console.log(`CSV actualizado: ${OUTPUT}`);
console.log(`Total filas: ${limpias.length}`);

// Resumen por fecha
const porFecha = {};
for (const row of limpias) {
  const cols  = row.split(',');
  const fecha = cols[2]?.trim();
  if (!porFecha[fecha]) porFecha[fecha] = new Set();
  porFecha[fecha].add(cols[3]?.trim().toLowerCase());
}

console.log('\n=== TOTAL POR FECHA ===');
const orden = ['02/07/2026', '03/07/2026', '06/07/2026', '07/07/2026', 'Sin fecha asignada'];
let totalGlobal = 0;
for (const fecha of orden) {
  const set = porFecha[fecha];
  if (!set) continue;
  console.log(`${fecha}: ${set.size} personas`);
  totalGlobal += set.size;
}
console.log(`─────────────────────`);
console.log(`TOTAL: ${totalGlobal} personas`);
