const https = require('https');
const fs = require('fs');
const path = require('path');
const TOKEN = process.env.HUBSPOT_TOKEN;

function api(method, apiPath, body) {
  return new Promise((resolve) => {
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };
    const req = https.request({ hostname: 'api.hubapi.com', path: apiPath, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(c).toString('utf8')) }));
    });
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());
}

function splitName(fullName) {
  const parts = toTitleCase(fullName).trim().split(/\s+/);
  if (parts.length <= 2) return { firstname: parts[0] || '', lastname: parts[1] || '' };
  return { firstname: parts.slice(0, -2).join(' '), lastname: parts.slice(-2).join(' ') };
}

const nomina = JSON.parse(fs.readFileSync(path.join(__dirname, 'nomina_datos.json'), 'utf8').replace(/^﻿/, ''));

(async () => {
  // 1. Crear/actualizar contactos (upsert por email)
  const chunks = [];
  for (let i = 0; i < nomina.length; i += 100) chunks.push(nomina.slice(i, i + 100));

  let totalOk = 0, totalErr = 0;
  for (let i = 0; i < chunks.length; i++) {
    const lote = chunks[i];
    console.log(`Procesando lote ${i + 1}/${chunks.length} (${lote.length} contactos)...`);
    const inputs = lote.map(p => {
      const { firstname, lastname } = splitName(p.nombre);
      return {
        properties: {
          email:      p.email.toLowerCase().trim(),
          firstname,
          lastname,
          company:    'FINAER',
          jobtitle:   toTitleCase(p.jerarquia),
          department: p.area,
          city:       p.ubicacion
        }
      };
    });
    const r = await api('POST', '/crm/v3/objects/contacts/batch/create', { inputs });
    if (r.status === 201) {
      totalOk += r.body.results?.length || 0;
      console.log(`  ✅ ${r.body.results?.length} creados`);
    } else if (r.status === 207) {
      const ok  = r.body.results?.length || 0;
      const err = r.body.errors?.length  || 0;
      totalOk  += ok; totalErr += err;
      console.log(`  ⚠️  ${ok} creados, ${err} errores (probablemente emails duplicados)`);
    } else {
      console.log(`  ❌ Error:`, JSON.stringify(r.body).slice(0, 300));
    }
  }
  console.log(`\nContactos creados: ${totalOk} | Errores: ${totalErr}`);

  // 2. Actualizar opciones de la propiedad del formulario para usar email como value
  console.log('\nActualizando opciones de recursos_inscribir_humand (email como value)...');
  const options = nomina
    .sort((a, b) => toTitleCase(a.nombre).localeCompare(toTitleCase(b.nombre)))
    .map((p, i) => ({
      label:        toTitleCase(p.nombre),
      value:        p.email.toLowerCase().trim(),
      displayOrder: i + 1,
      hidden:       false
    }));

  const rProp = await api('PATCH', '/crm/v3/properties/contacts/recursos_inscribir_humand', { options });
  if (rProp.status === 200) {
    console.log(`✅ Propiedad actualizada: ${rProp.body.options?.length} opciones con email como valor`);
  } else {
    console.log('❌ Error propiedad:', JSON.stringify(rProp.body).slice(0, 300));
  }

  // 3. Re-sincronizar opciones al formulario
  console.log('\nActualizando formulario con nuevas opciones...');
  const propTurno = await api('GET', '/crm/v3/properties/contacts/turno_capacitacion_humand');
  const turnoOpts = propTurno.body.options.map(o => ({ label: o.label, value: o.value, displayOrder: o.displayOrder, hidden: false, description: '' }));
  const recOpts   = options.map(o => ({ label: o.label, value: o.value, displayOrder: o.displayOrder, hidden: false, description: '' }));

  const rForm = await api('POST', '/forms/v2/forms/afcadf5d-3a40-4844-b3a4-4df144c9bebb', {
    name: 'Inscripcion Capacitacion Humand',
    submitText: 'Inscribir',
    formFieldGroups: [
      { fields: [], richText: { type: 'TEXT', body: '<h2 style="font-size:20px;color:#1a1a2e;margin-bottom:6px">Inscripción Capacitación Humand</h2><p style="color:#666;font-size:14px">Inscribí a tu equipo en el turno correspondiente. Cupo máximo por turno: 30 personas.</p>' }, isSmartGroup: false },
      { fields: [{ name: 'email', label: 'Email del líder', fieldType: 'text', type: 'string', required: true }] },
      { fields: [{ name: 'turno_capacitacion_humand', label: 'Turno de capacitación', fieldType: 'select', type: 'enumeration', required: true, options: turnoOpts }] },
      { fields: [{ name: 'recursos_inscribir_humand', label: 'Recursos a inscribir', fieldType: 'checkbox', type: 'enumeration', required: true, options: recOpts }] }
    ]
  });
  if (rForm.status === 200) console.log('✅ Formulario actualizado con emails como valores');
  else console.log('❌ Error form:', JSON.stringify(rForm.body).slice(0, 300));

  console.log('\n✅ Listo. El export de envíos ahora trae los emails de cada recurso seleccionado.');
})();
