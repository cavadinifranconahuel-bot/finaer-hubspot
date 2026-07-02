// wf_actualizar_deal_maestro.js
// WF: "Mora 2 — Actualizar Deal Maestro" (ID: 4465889492)
// Trigger: Deal en pipeline 3403406575 con deuda_alquiler IS_KNOWN (re-enrollment activo)
//
// Lógica:
//   1. Lee nro_expediente del deal de período que triggereó
//   2. Busca TODOS los deals de período (pipeline 3403406575) con ese nro_expediente
//   3. Suma todos los conceptos de todos los períodos
//   4. Busca o crea el deal maestro (pipeline 3920555199)
//   5. Actualiza el maestro con los totales consolidados
//   6. Asocia todos los deals de período al maestro + propaga contactos, empresas y tickets

const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  const hubspotClient = new hubspot.Client({ accessToken: process.env.token });

  const nroExpediente   = event.inputFields['nro_expediente'];
  const nombreInquilino = event.inputFields['nombre_y_apellido_del_inquilino'] || '';
  const dniInquilino    = event.inputFields['dni_inquilino'] || '';

  if (!nroExpediente) {
    return callback({ outputFields: { resultado: 'OMITIDO: sin nro_expediente' } });
  }

  // ── 1. Buscar todos los deals de período con este nro_expediente ─────────
  const PROPS_PERIODO = [
    'dealname',
    'deuda_alquiler', 'deuda_expensas', 'deuda_luz', 'deuda_gas',
    'deuda_abl', 'deuda_aysa', 'deuda_por_entrega_de_llaves',
    'tipo_de_incumplimiento'
  ];

  let allDeals = [];
  let after    = undefined;

  do {
    const page = await hubspotClient.crm.deals.searchApi.doSearch({
      filterGroups: [{
        filters: [
          { propertyName: 'pipeline',       operator: 'EQ', value: '3403406575' },
          { propertyName: 'nro_expediente', operator: 'EQ', value: String(nroExpediente) }
        ]
      }],
      properties: PROPS_PERIODO,
      limit: 100,
      ...(after ? { after } : {})
    });

    allDeals = allDeals.concat(page.results);
    after    = page.paging?.next?.after;
  } while (after);

  if (allDeals.length === 0) {
    return callback({ outputFields: { resultado: 'OMITIDO: no hay deals de período para este expediente' } });
  }

  // ── 2. Sumar todos los conceptos ─────────────────────────────────────────
  let sumAlquiler = 0;
  let sumExpensas = 0;
  let sumLuz      = 0;
  let sumGas      = 0;
  let sumAbl      = 0;
  let sumAysa     = 0;
  let sumLlaves   = 0;
  const tiposSet  = new Set();

  for (const d of allDeals) {
    const p = d.properties;
    sumAlquiler += parseFloat(p.deuda_alquiler              || 0);
    sumExpensas += parseFloat(p.deuda_expensas              || 0);
    sumLuz      += parseFloat(p.deuda_luz                   || 0);
    sumGas      += parseFloat(p.deuda_gas                   || 0);
    sumAbl      += parseFloat(p.deuda_abl                   || 0);
    sumAysa     += parseFloat(p.deuda_aysa                  || 0);
    sumLlaves   += parseFloat(p.deuda_por_entrega_de_llaves || 0);
    (p.tipo_de_incumplimiento || '').split(/[,;]/).map(t => t.trim()).filter(Boolean).forEach(t => tiposSet.add(t));
  }

  const tipoAcumulado = [...tiposSet].join(', ');
  const sumTotal      = sumAlquiler + sumExpensas + sumLuz + sumGas + sumAbl + sumAysa + sumLlaves;

  // ── 3. Buscar deal maestro ────────────────────────────────────────────────
  const searchMaestro = await hubspotClient.crm.deals.searchApi.doSearch({
    filterGroups: [{
      filters: [
        { propertyName: 'pipeline',       operator: 'EQ', value: '3920555199' },
        { propertyName: 'nro_expediente', operator: 'EQ', value: String(nroExpediente) }
      ]
    }],
    properties: ['dealname'],
    limit: 1
  });

  const propsMaestro = {
    deuda_alquiler:              String(sumAlquiler),
    deuda_expensas:              String(sumExpensas),
    deuda_luz:                   String(sumLuz),
    deuda_gas:                   String(sumGas),
    deuda_abl:                   String(sumAbl),
    deuda_aysa:                  String(sumAysa),
    deuda_por_entrega_de_llaves: String(sumLlaves),
    ...(nombreInquilino ? { nombre_y_apellido_del_inquilino: nombreInquilino } : {}),
    ...(dniInquilino    ? { dni_inquilino:                   dniInquilino    } : {}),
    ...(tipoAcumulado   ? { tipo_de_incumplimiento:          tipoAcumulado   } : {})
  };

  let dealMaestroId;
  let accion;

  if (searchMaestro.results.length > 0) {
    dealMaestroId = searchMaestro.results[0].id;
    await hubspotClient.crm.deals.basicApi.update(dealMaestroId, { properties: propsMaestro });
    accion = 'ACTUALIZADO';
  } else {
    const nuevoMaestro = await hubspotClient.crm.deals.basicApi.create({
      properties: {
        dealname:       [nroExpediente, nombreInquilino].filter(Boolean).join(' - '),
        pipeline:       '3920555199',
        dealstage:      '5598176486',
        nro_expediente: String(nroExpediente),
        ...propsMaestro
      }
    });
    dealMaestroId = nuevoMaestro.id;
    accion = 'CREADO';
  }

  // ── 4. Asociar deals de período y su ecosistema al maestro ───────────────
  const toAssociate = {
    contacts:  new Map(),
    companies: new Map(),
    tickets:   new Map(),
    orders:    new Map()
  };

  for (const d of allDeals) {
    // Deal de período → maestro
    try {
      await hubspotClient.crm.associations.v4.basicApi.create(
        'deals', d.id, 'deals', dealMaestroId,
        [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 451 }]
      );
    } catch (_) {}

    // Recolectar contactos, empresas, tickets y orders del deal de período
    for (const toType of ['contacts', 'companies', 'tickets', 'orders']) {
      try {
        const page = await hubspotClient.crm.associations.v4.basicApi.getPage('deals', d.id, toType);
        for (const r of (page.results || [])) {
          if (!toAssociate[toType].has(String(r.toObjectId))) {
            const mapped = (r.associationTypes || []).map(t => ({
              associationCategory: t.category,
              associationTypeId:   t.typeId
            }));
            toAssociate[toType].set(String(r.toObjectId), mapped);
          }
        }
      } catch (_) {}
    }
  }

  // Crear asociaciones en el maestro
  for (const [toType, map] of Object.entries(toAssociate)) {
    for (const [objId, types] of map) {
      if (types.length === 0) continue;
      try {
        await hubspotClient.crm.associations.v4.basicApi.create(
          'deals', dealMaestroId, toType, objId, types
        );
      } catch (_) {}
    }
  }

  return callback({
    outputFields: {
      resultado: `${accion} — maestro ${dealMaestroId} | ${allDeals.length} períodos | total: $${fmt(sumTotal)}`
    }
  });
};

function fmt(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
