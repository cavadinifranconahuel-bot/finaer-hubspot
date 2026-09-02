// custom_code_nutrir_o_crear_deal_periodo.js
// WF: "Mora 2 — Nutrir o Crear Deal Período" (ID: 4465972431)
// Trigger: Ticket en pipeline 3353793749, etapa Cerrado (4594251972),
//          resultado_del_caso = "Resuelto con pago total FINAER" o "Resuelto con pago parcial FINAER"
//
// Nombres internos de propiedades de DEUDA:
//   Tickets: deuda_alquiler / deuda_expensas / deuda_luz / deuda_gas / deuda_abl / deuda_aysa
//   Deals:   alquiler       / deuda_expensas / luz       / gas       / abl       / deuda_aysa
//   (deuda_expensas, deuda_aysa y deuda_por_entrega_de_llaves son iguales en ambos objetos)
//
// Lógica:
//   ¿Existe deal en pipeline 3403406575 con mismo nro_expediente y periodo_de_deuda?
//   → SÍ: nutre campos vacíos + merge tipo_de_incumplimiento + nota + asegura asociación con maestro
//   → NO: crea deal de período + asocia al ticket + busca/crea deal maestro + asocia
//
// Fix 2026-09-02: el deal nuevo heredaba propietario por defecto en lugar del propietario
//   del deal más antiguo del expediente. Se agrega lógica de herencia de hubspot_owner_id.

const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  const hubspotClient = new hubspot.Client({ accessToken: process.env.token });

  const ticketId = String(event.object.objectId);

  // Leer inputs del ticket (nombres de propiedades de TICKET con prefijo deuda_)
  const nroExpediente      = event.inputFields['nro_expediente'];
  const periodoDeDeuda     = event.inputFields['periodo_de_deuda'];
  const nombreInquilino    = event.inputFields['nombre_y_apellido_del_inquilino'] || '';
  const dniInquilino       = event.inputFields['dni_inquilino'] || '';
  const tipoIncumplimiento = event.inputFields['tipo_de_incumplimiento'] || '';
  const ownerTicket        = event.inputFields['hubspot_owner_id'] || '';

  const tAlquiler = parseFloat(event.inputFields['deuda_alquiler']              || 0);
  const tExpensas = parseFloat(event.inputFields['deuda_expensas']              || 0);
  const tLuz      = parseFloat(event.inputFields['deuda_luz']                   || 0);
  const tGas      = parseFloat(event.inputFields['deuda_gas']                   || 0);
  const tAbl      = parseFloat(event.inputFields['deuda_abl']                   || 0);
  const tAysa     = parseFloat(event.inputFields['deuda_aysa']                  || 0);
  const tLlaves   = parseFloat(event.inputFields['deuda_por_entrega_de_llaves'] || 0);

  if (!nroExpediente || !periodoDeDeuda) {
    return callback({ outputFields: { resultado: 'OMITIDO: falta nro_expediente o periodo_de_deuda' } });
  }

  const totalTicket = tAlquiler + tExpensas + tLuz + tGas + tAbl + tAysa + tLlaves;
  const ahora = new Date().toLocaleString('es-AR', { timeZone: 'America/Buenos_Aires' });

  // ── 1. Buscar deal de período existente ────────────────────────────────
  const searchPeriodo = await hubspotClient.crm.deals.searchApi.doSearch({
    filterGroups: [{
      filters: [
        { propertyName: 'pipeline',         operator: 'EQ', value: '3403406575' },
        { propertyName: 'nro_expediente',   operator: 'EQ', value: String(nroExpediente) },
        { propertyName: 'periodo_de_deuda', operator: 'EQ', value: periodoDeDeuda }
      ]
    }],
    properties: [
      'dealname', 'hubspot_owner_id',
      'alquiler', 'deuda_expensas', 'luz', 'gas', 'abl', 'deuda_aysa',
      'deuda_por_entrega_de_llaves', 'tipo_de_incumplimiento'
    ],
    limit: 1
  });

  // ── 2. Determinar propietario correcto ─────────────────────────────────
  // Buscar el deal más antiguo del expediente para heredar su propietario.
  // Así el deal nuevo siempre queda en manos de quien llevó la primera deuda,
  // independientemente de quién cierre el ticket del período actual.
  let ownerFinal = ownerTicket;

  const searchPrimerDeal = await hubspotClient.crm.deals.searchApi.doSearch({
    filterGroups: [{
      filters: [
        { propertyName: 'pipeline',       operator: 'EQ', value: '3403406575' },
        { propertyName: 'nro_expediente', operator: 'EQ', value: String(nroExpediente) }
      ]
    }],
    properties: ['hubspot_owner_id'],
    sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
    limit: 1
  });

  if (searchPrimerDeal.results.length > 0) {
    const primerOwner = searchPrimerDeal.results[0].properties.hubspot_owner_id;
    if (primerOwner) ownerFinal = primerOwner;
  }

  // ── Helper: merge tipo_de_incumplimiento (tolera , o ; como separador) ─
  function mergeTipos(existente, nuevo) {
    const set = new Set([
      ...(existente || '').split(/[,;]/).map(t => t.trim()).filter(Boolean),
      ...(nuevo     || '').split(/[,;]/).map(t => t.trim()).filter(Boolean)
    ]);
    return [...set].join(';');
  }

  // ── Helper: buscar o crear deal maestro y asociar el deal de período ───
  async function asegurarMaestro(dealPeriodoId) {
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

    let dealMaestroId;
    if (searchMaestro.results.length > 0) {
      dealMaestroId = searchMaestro.results[0].id;
    } else {
      const nuevoMaestro = await hubspotClient.crm.deals.basicApi.create({
        properties: {
          dealname:       [nroExpediente, nombreInquilino].filter(Boolean).join(' - '),
          pipeline:       '3920555199',
          dealstage:      '5598176486',
          nro_expediente: String(nroExpediente)
        }
      });
      dealMaestroId = nuevoMaestro.id;
    }

    try {
      await hubspotClient.crm.associations.v4.basicApi.create(
        'deals', dealPeriodoId, 'deals', dealMaestroId,
        [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 451 }]
      );
    } catch (_) {}

    return dealMaestroId;
  }

  // ── CASO SÍ: deal existe (SAI lo creó previamente) ─────────────────────
  if (searchPeriodo.results.length > 0) {
    const deal   = searchPeriodo.results[0];
    const dealId = deal.id;
    const p      = deal.properties;

    const CAMPOS_DEUDA = {
      alquiler:                    tAlquiler,
      deuda_expensas:              tExpensas,
      luz:                         tLuz,
      gas:                         tGas,
      abl:                         tAbl,
      deuda_aysa:                  tAysa,
      deuda_por_entrega_de_llaves: tLlaves
    };

    // Solo escribir conceptos que el deal todavía no tiene
    const propiedadesNuevas = {};
    for (const [campo, valor] of Object.entries(CAMPOS_DEUDA)) {
      if (parseFloat(p[campo] || 0) === 0 && valor > 0) {
        propiedadesNuevas[campo] = String(valor);
      }
    }

    // Merge tipo_de_incumplimiento
    const tipoMergeado = mergeTipos(p.tipo_de_incumplimiento, tipoIncumplimiento);
    if (tipoMergeado !== (p.tipo_de_incumplimiento || '').trim()) {
      propiedadesNuevas.tipo_de_incumplimiento = tipoMergeado;
    }

    // Asignar propietario si el deal no tiene uno
    if (!p.hubspot_owner_id && ownerFinal) {
      propiedadesNuevas.hubspot_owner_id = ownerFinal;
    }

    if (Object.keys(propiedadesNuevas).length > 0) {
      await hubspotClient.crm.deals.basicApi.update(dealId, { properties: propiedadesNuevas });
    }

    // Nota
    const conceptosNuevos = Object.entries(CAMPOS_DEUDA)
      .filter(([campo, valor]) => parseFloat(p[campo] || 0) === 0 && valor > 0)
      .map(([campo, valor]) => `  ${campo}: $${fmt(valor)}`);

    const detalleConceptos = conceptosNuevos.length > 0
      ? conceptosNuevos.join('\n')
      : '  (sin conceptos nuevos — deal ya tenía todos los valores)';

    const nota =
      `[${ahora}] Ticket #${ticketId} cerrado — ${tipoIncumplimiento}\n` +
      `  Período: ${periodoDeDeuda} | Total ticket: $${fmt(totalTicket)}\n` +
      `  Conceptos incorporados al deal:\n` +
      detalleConceptos;

    await crearNota(hubspotClient, nota, dealId, 214);

    // Asegurar asociación con deal maestro
    await asegurarMaestro(dealId);

    return callback({ outputFields: { resultado: `NUTRIDO — deal ${dealId} | período: ${periodoDeDeuda}` } });
  }

  // ── CASO NO: crear deal de período nuevo ──────────────────────────────
  const dealNombre = [nroExpediente, nombreInquilino, periodoDeDeuda].filter(Boolean).join(' - ');

  const nuevoPeriodo = await hubspotClient.crm.deals.basicApi.create({
    properties: {
      dealname:                        dealNombre,
      pipeline:                        '3403406575',
      dealstage:                       '4660102351',
      nro_expediente:                  String(nroExpediente),
      periodo_de_deuda:                periodoDeDeuda,
      nombre_y_apellido_del_inquilino: nombreInquilino,
      ...(ownerFinal        ? { hubspot_owner_id:        ownerFinal }        : {}),
      ...(dniInquilino      ? { dni_inquilino:           dniInquilino }      : {}),
      ...(tipoIncumplimiento ? { tipo_de_incumplimiento: tipoIncumplimiento } : {}),
      ...(tAlquiler ? { alquiler:                    String(tAlquiler) } : {}),
      ...(tExpensas ? { deuda_expensas:              String(tExpensas) } : {}),
      ...(tLuz      ? { luz:                         String(tLuz)     } : {}),
      ...(tGas      ? { gas:                         String(tGas)     } : {}),
      ...(tAbl      ? { abl:                         String(tAbl)     } : {}),
      ...(tAysa     ? { deuda_aysa:                  String(tAysa)    } : {}),
      ...(tLlaves   ? { deuda_por_entrega_de_llaves: String(tLlaves)  } : {}),
    }
  });

  const dealPeriodoId = nuevoPeriodo.id;

  // Asociar deal de período → ticket
  await hubspotClient.crm.associations.v4.basicApi.create(
    'deals', dealPeriodoId, 'tickets', ticketId,
    [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 27 }]
  );

  // Nota en el deal nuevo
  const notaNuevo =
    `[${ahora}] Deal de período creado desde ticket #${ticketId}\n` +
    `  Período: ${periodoDeDeuda}\n` +
    `  Alquiler:  $${fmt(tAlquiler)}\n` +
    `  Expensas:  $${fmt(tExpensas)}\n` +
    `  Luz:       $${fmt(tLuz)}\n` +
    `  Gas:       $${fmt(tGas)}\n` +
    `  ABL:       $${fmt(tAbl)}\n` +
    `  AYSA:      $${fmt(tAysa)}\n` +
    `  Llaves:    $${fmt(tLlaves)}\n` +
    `  Total:     $${fmt(totalTicket)}`;

  await crearNota(hubspotClient, notaNuevo, dealPeriodoId, 214);

  // Buscar o crear deal maestro y asociar
  await asegurarMaestro(dealPeriodoId);

  return callback({
    outputFields: {
      resultado: `CREADO — deal período ${dealPeriodoId} | período: ${periodoDeDeuda} | total: $${fmt(totalTicket)}`
    }
  });
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function crearNota(client, texto, dealId, assocTypeId) {
  await client.crm.objects.notes.basicApi.create({
    properties: {
      hs_note_body: texto,
      hs_timestamp: String(Date.now())
    },
    associations: [{
      to:    { id: dealId },
      types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assocTypeId }]
    }]
  });
}
