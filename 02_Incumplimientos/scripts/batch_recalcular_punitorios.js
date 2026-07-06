// batch_recalcular_punitorios.js
// Aplica Math.ceil a los campos de punitorios que tienen decimales.
// NO recalcula desde las fechas — solo redondea el valor que ya está guardado.
// Si el campo ya es entero, no lo toca.
//
// Deals: pipeline 3403406575
// Tickets: pipeline 3353793749
//
// node batch_recalcular_punitorios.js           → producción
// node batch_recalcular_punitorios.js --dry-run → solo muestra, no escribe

const hubspot = require('@hubspot/api-client');

const TOKEN   = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const DRY_RUN = process.argv.includes('--dry-run');

const client = new hubspot.Client({ accessToken: TOKEN });

function tieneDecimales(val) {
  const n = parseFloat(val);
  return !isNaN(n) && n !== Math.floor(n);
}

function ceil(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.ceil(n);
}

async function procesarObjeto({ tipo, pipeline, buscarFn, actualizarFn, propNombre }) {
  console.log(`\n══════ ${tipo.toUpperCase()} ══════`);
  let after;
  let totalActualizados = 0;

  do {
    const res = await buscarFn(after);

    for (const obj of res.results) {
      const p   = obj.properties;
      const id  = obj.id;
      const nom = p[propNombre] || id;

      const pa = p.punitorio_alquiler;
      const ps = p.punitorio_servicios;
      const pt = p.total_punitorios;

      if (!tieneDecimales(pa) && !tieneDecimales(ps) && !tieneDecimales(pt)) continue;

      const nuevoAlq  = ceil(pa);
      const nuevoServ = ceil(ps);
      const nuevoTot  = nuevoAlq + nuevoServ;

      console.log(`  ${nom} (${id})`);
      console.log(`    Antes: alq=${pa}  serv=${ps}  total=${pt}`);
      console.log(`    Nuevo: alq=${nuevoAlq}  serv=${nuevoServ}  total=${nuevoTot}`);

      if (!DRY_RUN) {
        try {
          await actualizarFn(id, {
            punitorio_alquiler:  nuevoAlq.toString(),
            punitorio_servicios: nuevoServ.toString(),
            total_punitorios:    nuevoTot.toString()
          });
          console.log(`    ✅ Actualizado`);
          totalActualizados++;
          await new Promise(r => setTimeout(r, 120));
        } catch (e) {
          console.error(`    ❌ Error: ${e.message}`);
        }
      } else {
        totalActualizados++;
      }
    }

    after = res.paging?.next?.after;
  } while (after);

  console.log(`\n${tipo} ${DRY_RUN ? 'para actualizar' : 'actualizados'}: ${totalActualizados}`);
}

async function main() {
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN' : 'PRODUCCIÓN'}`);
  console.log(`Fecha: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Buenos_Aires' })}`);

  await procesarObjeto({
    tipo: 'Deals',
    propNombre: 'dealname',
    buscarFn: (after) => client.crm.deals.searchApi.doSearch({
      filterGroups: [{ filters: [
        { propertyName: 'pipeline',                operator: 'EQ',          value: '3403406575' },
        { propertyName: 'punitorio_alquiler',      operator: 'HAS_PROPERTY' },
      ]}],
      properties: ['dealname', 'punitorio_alquiler', 'punitorio_servicios', 'total_punitorios'],
      limit: 100,
      after
    }),
    actualizarFn: (id, props) => client.crm.deals.basicApi.update(id, { properties: props })
  });

  await procesarObjeto({
    tipo: 'Tickets',
    propNombre: 'subject',
    buscarFn: (after) => client.crm.tickets.searchApi.doSearch({
      filterGroups: [{ filters: [
        { propertyName: 'hs_pipeline',        operator: 'EQ',          value: '3353793749' },
        { propertyName: 'punitorio_alquiler', operator: 'HAS_PROPERTY' },
      ]}],
      properties: ['subject', 'punitorio_alquiler', 'punitorio_servicios', 'total_punitorios'],
      limit: 100,
      after
    }),
    actualizarFn: (id, props) => client.crm.tickets.basicApi.update(id, { properties: props })
  });

  console.log('\n══════ FIN ══════');
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
