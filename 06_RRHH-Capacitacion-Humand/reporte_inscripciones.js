const https = require('https');
const fs = require('fs');
const path = require('path');
const TOKEN = process.env.HUBSPOT_TOKEN;
const FORM_ID = 'afcadf5d-3a40-4844-b3a4-4df144c9bebb';

function api(method, apiPath) {
  return new Promise((resolve) => {
    const headers = { 'Authorization': 'Bearer ' + TOKEN };
    https.request({ hostname: 'api.hubapi.com', path: apiPath, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => resolve(JSON.parse(Buffer.concat(c).toString('utf8'))));
    }).end();
  });
}

const TURNOS = {
  jueves_2_julio:    'Jueves 2 de Julio',
  viernes_3_julio:   'Viernes 3 de Julio',
  lunes_6_julio:     'Lunes 6 de Julio',
  martes_7_julio:    'Martes 7 de Julio',
  miercoles_8_julio: 'Miércoles 8 de Julio'
};

// Leer mapa email → nombre desde la nómina
const nomina = JSON.parse(fs.readFileSync(path.join(__dirname, 'nomina_datos.json'), 'utf8').replace(/^﻿/, ''));
function toTitleCase(s) { return s.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase()); }
const emailToNombre = {};
const slugToEmail = {};
nomina.forEach(p => {
  if (!p.email) return;
  const email = p.email.toLowerCase().trim();
  emailToNombre[email] = toTitleCase(p.nombre);
  // slug: mismo algoritmo que usó el script original
  const slug = p.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  slugToEmail[slug] = email;
});

function resolveEmail(val) {
  const v = val.trim().toLowerCase();
  if (v.includes('@')) return v;          // ya es email
  return slugToEmail[v] || v;             // convertir slug → email
}

(async () => {
  // Leer todos los envíos paginando
  let submissions = [], url = `/form-integrations/v1/submissions/forms/${FORM_ID}?limit=50`;
  do {
    const res = await api('GET', url);
    submissions = submissions.concat(res.results || []);
    url = res.paging?.next?.link?.replace('https://api.hubapi.com', '') || null;
  } while (url);

  console.log(`Total de envíos: ${submissions.length}\n`);

  // Agrupar por turno
  const porTurno = {};
  Object.keys(TURNOS).forEach(k => porTurno[k] = []);

  for (const s of submissions) {
    const fields = { recursos_inscribir_humand: [] };
    (s.values || []).forEach(v => {
      if (v.name === 'recursos_inscribir_humand') fields.recursos_inscribir_humand.push(v.value);
      else fields[v.name] = v.value;
    });

    const turnoVal = fields['turno_capacitacion_humand'];
    const recursos = fields['recursos_inscribir_humand'];
    const lider    = fields['email'] || 'desconocido';

    if (!turnoVal || !porTurno[turnoVal]) continue;

    for (const raw of recursos) {
      const email = resolveEmail(raw);
      porTurno[turnoVal].push({ nombre: emailToNombre[email] || email, email, lider });
    }
  }

  // Generar reporte en consola y CSV
  const lines = ['Turno,Nombre,Email,Email Líder'];
  let totalInscriptos = 0;

  for (const [key, label] of Object.entries(TURNOS)) {
    const personas = porTurno[key];
    // Deduplicar por email (si un mismo recurso fue inscripto dos veces)
    const unicas = [...new Map(personas.map(p => [p.email, p])).values()];
    unicas.sort((a, b) => a.nombre.localeCompare(b.nombre));

    console.log(`━━━ ${label} (${unicas.length}/30) ━━━`);
    if (unicas.length === 0) {
      console.log('  Sin inscriptos aún');
    } else {
      unicas.forEach((p, i) => {
        console.log(`  ${String(i+1).padStart(2)}. ${p.nombre.padEnd(40)} ${p.email}`);
        lines.push(`"${label}","${p.nombre}","${p.email}","${p.lider}"`);
      });
    }
    console.log('');
    totalInscriptos += unicas.length;
  }

  console.log(`Total inscriptos: ${totalInscriptos} / 120 cupos`);

  // Guardar CSV
  const csvPath = path.join(__dirname, 'reporte_inscripciones.csv');
  fs.writeFileSync(csvPath, '﻿' + lines.join('\n'), 'utf8');
  console.log(`\nCSV guardado en: ${csvPath}`);
})();
