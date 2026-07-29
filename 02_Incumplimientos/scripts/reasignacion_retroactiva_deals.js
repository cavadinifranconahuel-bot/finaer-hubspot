// Reasignación retroactiva — Deals pipeline 3403406575
// Para cada grupo (nro_expediente + DNI + nombre): asigna a todos el owner del deal más antiguo
// Usar SOLO una vez, antes de activar WF 4454895830

const TOKEN    = process.env.HUBSPOT_TOKEN;
const BASE     = 'https://api.hubapi.com';
const PIPELINE = '3403406575';
const DELAY_MS = 120;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function apiFetch(path, method = 'GET', body) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  return r.json();
}

async function getAllDeals() {
  const deals = [];
  let after;
  let pag = 0;

  while (true) {
    pag++;
    const body = {
      filterGroups: [{
        filters: [
          { propertyName: 'pipeline',                        operator: 'EQ',       value: PIPELINE },
          { propertyName: 'nro_expediente',                  operator: 'HAS_PROPERTY' },
          { propertyName: 'dni_inquilino',                   operator: 'HAS_PROPERTY' },
          { propertyName: 'nombre_y_apellido_del_inquilino', operator: 'HAS_PROPERTY' }
        ]
      }],
      properties: ['nro_expediente', 'dni_inquilino', 'nombre_y_apellido_del_inquilino', 'hubspot_owner_id', 'createdate'],
      sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
      limit: 200,
      ...(after ? { after } : {})
    };

    const data = await apiFetch('/crm/v3/objects/deals/search', 'POST', body);
    if (!data.results?.length) break;
    deals.push(...data.results);
    process.stdout.write(`\rCargando deals... ${deals.length} (pág ${pag})`);

    if (data.paging?.next?.after) {
      after = data.paging.next.after;
      await sleep(DELAY_MS);
    } else break;
  }
  console.log();
  return deals;
}

async function main() {
  console.log('Cargando deals del pipeline de períodos...');
  const deals = await getAllDeals();
  console.log(`Total deals con expediente + DNI + nombre: ${deals.length}\n`);

  // Agrupar por nro_expediente + dni + nombre
  const grupos = {};
  for (const d of deals) {
    const key = [
      d.properties.nro_expediente?.trim(),
      d.properties.dni_inquilino?.trim(),
      d.properties.nombre_y_apellido_del_inquilino?.trim()
    ].join('__');
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(d);
  }

  const conMultiples = Object.values(grupos).filter(g => g.length > 1);
  console.log(`Grupos con más de 1 deal: ${conMultiples.length}`);

  const aReasignar = conMultiples.flatMap(g => g.slice(1)); // todos menos el primero
  console.log(`Deals a reasignar: ${aReasignar.length}\n`);

  if (!aReasignar.length) {
    console.log('Nada para reasignar.');
    return;
  }

  let actualizados = 0, sinCambio = 0, errores = 0;

  for (const grupo of conMultiples) {
    const primero   = grupo[0]; // más antiguo (sorted ASC)
    const ownerRef  = primero.properties.hubspot_owner_id;

    if (!ownerRef) {
      console.log(`\nGrupo sin owner en deal ${primero.id} — omitido`);
      sinCambio += grupo.length - 1;
      continue;
    }

    for (const deal of grupo.slice(1)) {
      if (deal.properties.hubspot_owner_id === ownerRef) {
        sinCambio++;
        continue;
      }
      try {
        await apiFetch(`/crm/v3/objects/deals/${deal.id}`, 'PATCH', {
          properties: { hubspot_owner_id: ownerRef }
        });
        actualizados++;
        process.stdout.write(`\rActualizados: ${actualizados} | Sin cambio: ${sinCambio} | Errores: ${errores}`);
        await sleep(DELAY_MS);
      } catch (e) {
        errores++;
        console.error(`\nError en deal ${deal.id}:`, e.message);
      }
    }
  }

  console.log(`\n\n✅ Reasignación completada:`);
  console.log(`   Actualizados: ${actualizados}`);
  console.log(`   Sin cambio:   ${sinCambio}`);
  console.log(`   Errores:      ${errores}`);
}

main().catch(console.error);
