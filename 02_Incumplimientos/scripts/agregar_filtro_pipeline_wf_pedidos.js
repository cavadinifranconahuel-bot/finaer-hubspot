// agregar_filtro_pipeline_wf_pedidos.js
// Agrega filtro pipeline=3403406575 a los WFs de Pedido Recupero y Desembolso
// para que no disparen en deals del pipeline maestro (3920555199)
// node agregar_filtro_pipeline_wf_pedidos.js

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';

const filtroPipeline = {
  filterType: 'PROPERTY',
  property:   'pipeline',
  operation:  {
    operationType:                'ENUMERATION',
    operator:                     'IS_ANY_OF',
    values:                       ['3403406575'],
    includeObjectsWithNoValueSet: false
  }
};

const WFS = {
  '4128732405': {
    nombre:    'Pedido Recupero - Incumplimientos',
    propiedad: 'monto_recupero'
  },
  '4128739569': {
    nombre:    'Pedido Desembolso - Incumplimientos',
    propiedad: 'monto_desembolso'
  }
};

async function main() {
  const fetch = (await import('node-fetch')).default;
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type':  'application/json'
  };

  for (const [wfId, meta] of Object.entries(WFS)) {
    // Obtener WF actual
    const getRes  = await fetch(`https://api.hubapi.com/automation/v4/flows/${wfId}`, { headers });
    const wf      = await getRes.json();

    if (!getRes.ok) {
      console.error(`ERROR obteniendo ${wfId}:`, wf.message);
      continue;
    }

    // Verificar si el filtro de pipeline ya existe
    const filtrosActuales = wf.enrollmentCriteria.listFilterBranch.filterBranches[0].filters;
    const yaExiste = filtrosActuales.some(f => f.property === 'pipeline');

    if (yaExiste) {
      console.log(`${meta.nombre} — filtro de pipeline ya existe, sin cambios`);
      continue;
    }

    // Agregar el filtro de pipeline a la rama AND existente
    filtrosActuales.push(filtroPipeline);

    // PUT con payload completo
    const putRes  = await fetch(`https://api.hubapi.com/automation/v4/flows/${wfId}`, {
      method:  'PUT',
      headers,
      body:    JSON.stringify(wf)
    });
    const result = await putRes.json();

    if (!putRes.ok) {
      console.error(`ERROR actualizando ${wfId}:`, JSON.stringify(result, null, 2));
    } else {
      console.log(`${meta.nombre} — actualizado OK | revisionId: ${result.revisionId}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
