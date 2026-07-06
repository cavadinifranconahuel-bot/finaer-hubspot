// faltantes_humand.js
// Compara nómina interna vs inscriptos en Humand → lista de faltantes

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const NOMINA_PATH = 'C:/Users/Usuario/Downloads/20260610_Nomina.xlsx';
const CSV_PATH    = path.join(__dirname, '..', '..', '06_RRHH-Capacitacion-Humand', 'inscripciones_humand_29jun_final.csv');
const OUTPUT      = path.join(__dirname, '..', '..', '06_RRHH-Capacitacion-Humand', 'faltantes_humand.csv');

// 1. Leer nómina
const wb      = XLSX.readFile(NOMINA_PATH);
const ws      = wb.Sheets[wb.SheetNames[0]];
const rows    = XLSX.utils.sheet_to_json(ws, { header: 1 });
const header  = rows[0]; // ["Usuario","Nombre y apellido","Área","Jerarquía","Ubicación"]
const empleados = rows.slice(1).map(r => ({
  email:    (r[0] || '').trim().toLowerCase(),
  nombre:   r[1] || '',
  area:     r[2] || '',
  jerarquia: r[3] || '',
  ubicacion: r[4] || ''
})).filter(e => e.email);

console.log(`Nómina: ${empleados.length} empleados`);

// 2. Leer inscriptos del CSV (columna "Recurso interno")
const csvRaw    = fs.readFileSync(CSV_PATH, 'utf8');
const csvLines  = csvRaw.split('\n').filter(l => l.trim()).slice(1); // sin header
const inscriptos = new Set(
  csvLines.map(l => l.split(',')[3]?.trim().toLowerCase()).filter(Boolean)
);

console.log(`Inscriptos en Humand: ${inscriptos.size} personas`);

// 3. Faltantes = están en nómina pero no en inscriptos
const faltantes = empleados.filter(e => !inscriptos.has(e.email));

console.log(`\nFaltantes: ${faltantes.length} empleados\n`);

// 4. Generar CSV de faltantes
const csvHeader = 'Nombre y apellido,Email,Área,Jerarquía,Ubicación';
const csvLines2 = faltantes.map(e =>
  `${e.nombre},${e.email},${e.area},${e.jerarquia},${e.ubicacion}`
);
fs.writeFileSync(OUTPUT, [csvHeader, ...csvLines2].join('\n'), 'utf8');
console.log(`CSV generado: ${OUTPUT}`);

// 5. Resumen por área
const porArea = {};
faltantes.forEach(e => {
  if (!porArea[e.area]) porArea[e.area] = 0;
  porArea[e.area]++;
});
console.log('=== FALTANTES POR ÁREA ===');
Object.entries(porArea)
  .sort((a, b) => b[1] - a[1])
  .forEach(([area, n]) => console.log(`  ${area}: ${n}`));
