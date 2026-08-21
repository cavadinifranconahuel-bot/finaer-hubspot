/**
 * WF: Crear / actualizar tickets desde notificación de incumplimiento
 * Trigger: envío del form "Notificacion de Incumplimiento" (16350864-6359-4241-9d44-d8639a7af726)
 * Secreto requerido: token (PAT)
 * Runtime: Node.js 20.x
 *
 * Lógica por período:
 *   - Si ya existe un ticket con mismo periodo_de_deuda + dni_inquilino → actualiza + crea nota
 *   - Si no existe → crea ticket nuevo
 * Lógica de asignación:
 *   - Busca ticket previo con mismo DNI → reusar su owner
 *   - Si no hay previo → elige de GESTORES por hash del DNI
 */

const https = require('https');

exports.main = async (event, callback) => {
  const TOKEN     = process.env.token;
  const contactId = String(event.object.objectId);

  // ── Gestores de incumplimientos (round-robin) ─────────────────────────────
  const GESTORES = ['32624020','33991733','29822625','29334871','29822627'];

  function api(method, path, body) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const req  = https.request({
        hostname: 'api.hubapi.com', path, method,
        headers: {
          'Authorization': 'Bearer ' + TOKEN,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        }
      }, res => {
        const chunks = [];
        res.on('data', d => chunks.push(d));
        res.on('end', () => {
          try { resolve({ s: res.statusCode, b: JSON.parse(Buffer.concat(chunks).toString()) }); }
          catch(e) { resolve({ s: res.statusCode, b: Buffer.concat(chunks).toString() }); }
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  // ── Leer propiedades del Contact ─────────────────────────────────────────
  const campos = [
    'nombre_y_apellido_del_inquilino','dni_inquilino',
    'num_periodos_incumplimiento',
    'periodo_de_deuda','tipo_de_incumplimiento',
    'deuda_alquiler','deuda_expensas','deuda_luz','deuda_gas','deuda_abl','deuda_aysa',
    'periodo_de_deuda_2','tipo_de_incumplimiento_2',
    'deuda_alquiler_2','deuda_expensas_2','deuda_luz_2','deuda_gas_2','deuda_abl_2','deuda_aysa_2',
    'periodo_de_deuda_3','tipo_de_incumplimiento_3',
    'deuda_alquiler_3','deuda_expensas_3','deuda_luz_3','deuda_gas_3','deuda_abl_3','deuda_aysa_3',
    'periodo_de_deuda_4','tipo_de_incumplimiento_4',
    'deuda_alquiler_4','deuda_expensas_4','deuda_luz_4','deuda_gas_4','deuda_abl_4','deuda_aysa_4',
    'alias_cbu_impagos','alias_impagos','banco','nombre_y_apellido_del_propietario','cuit_cuil',
    'observaciones_incumplimiento','archivos_adjuntos_incumplimiento'
  ];

  const qs   = campos.map(c => 'properties=' + c).join('&');
  const cRes = await api('GET', '/crm/v3/objects/contacts/' + contactId + '?' + qs);
  if (cRes.s !== 200) throw new Error('No se pudo leer el Contact: ' + JSON.stringify(cRes.b));
  const p = cRes.b.properties;

  // ── Company asociada al Contact (opcional) ───────────────────────────────
  const aRes      = await api('GET', '/crm/v4/objects/contacts/' + contactId + '/associations/companies');
  const companyId = aRes.b.results && aRes.b.results[0] && aRes.b.results[0].toObjectId
    ? String(aRes.b.results[0].toObjectId)
    : null;

  // ── Determinar owner para este lote ──────────────────────────────────────
  let ownerIdParaUsar = null;

  if (p.dni_inquilino) {
    const ownerSearch = await api('POST', '/crm/v3/objects/tickets/search', {
      filterGroups: [{ filters: [
        { propertyName: 'dni_inquilino', operator: 'EQ', value: p.dni_inquilino },
        { propertyName: 'hs_pipeline',   operator: 'EQ', value: '4056971510'  }
      ]}],
      properties: ['hubspot_owner_id'],
      sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
      limit: 1
    });
    ownerIdParaUsar = ownerSearch.b.results && ownerSearch.b.results[0]
      ? ownerSearch.b.results[0].properties.hubspot_owner_id || null
      : null;

    if (!ownerIdParaUsar) {
      const idx = parseInt(p.dni_inquilino, 10) % GESTORES.length;
      ownerIdParaUsar = GESTORES[idx];
    }
  }

  // ── Mapa concepto → campo de monto ───────────────────────────────────────
  const CONCEPTO_A_MONTO = {
    'Alquiler': 'deuda_alquiler',
    'Expensas': 'deuda_expensas',
    'Luz':      'deuda_luz',
    'Gas':      'deuda_gas',
    'ABL':      'deuda_abl',
    'Aysa':     'deuda_aysa',
  };
  const MONTO_PROPS = Object.values(CONCEPTO_A_MONTO);

  // ── Buscar ticket existente para período + DNI ───────────────────────────
  async function buscarTicketExistente(periodo) {
    if (!p.dni_inquilino) return null;
    const r = await api('POST', '/crm/v3/objects/tickets/search', {
      filterGroups: [{ filters: [
        { propertyName: 'periodo_de_deuda', operator: 'EQ', value: periodo },
        { propertyName: 'dni_inquilino',     operator: 'EQ', value: p.dni_inquilino },
        { propertyName: 'hs_pipeline',       operator: 'EQ', value: '4056971510' }
      ]}],
      properties: ['subject', 'tipo_de_incumplimiento', 'hs_pipeline_stage', ...MONTO_PROPS],
      sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
      limit: 1
    });
    const ticket = r.b.results && r.b.results[0] ? r.b.results[0] : null;
    if (ticket && ticket.properties && ticket.properties.hs_pipeline_stage === '4594251972') return null;
    return ticket;
  }

  // ── Crear nota de actualización de deuda ─────────────────────────────────
  async function crearNota(ticketId, tiposNuevos, montosNuevos) {
    const detalle = tiposNuevos
      .map(c => {
        const monto = montosNuevos[CONCEPTO_A_MONTO[c]];
        return monto ? c + ': $' + Number(monto).toLocaleString('es-AR') : c;
      })
      .join(' | ');

    const detalleStr = detalle ? ' — ' + detalle : '';
    const body = '<b>Actualización:</b> se notificó una nueva deuda del concepto <b>' + tiposNuevos.join(', ') + '</b>' + detalleStr + '.';

    await api('POST', '/engagements/v1/engagements', {
      engagement:   { active: true, type: 'NOTE', timestamp: Date.now() },
      associations: { contactIds: [], companyIds: [], dealIds: [], ticketIds: [parseInt(ticketId, 10)] },
      metadata:     { body: body }
    });
  }

  // ── Crear nota con archivos adjuntos en sidebar del ticket ─────────────────
  // attachments[] acepta IDs de Files API v3 directamente — aparece en sidebar.
  async function crearNotaArchivos(ticketId) {
    const fileIdsStr = p.archivos_adjuntos_incumplimiento || '';
    const ids = fileIdsStr.split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length) return;

    const nr = await api('POST', '/engagements/v1/engagements', {
      engagement:   { active: true, type: 'NOTE', timestamp: Date.now() },
      associations: { contactIds: [], companyIds: [], dealIds: [], ticketIds: [parseInt(ticketId, 10)] },
      metadata:     { body: '<b>Documentación adjuntada desde el formulario de notificación</b>' },
      attachments:  ids.map(id => ({ id: parseInt(id, 10) }))
    });
    if (nr.s !== 200 && nr.s !== 201) {
      throw new Error('Error creando nota archivos: ' + nr.s + ' ' + JSON.stringify(nr.b).slice(0, 150));
    }
  }

  // ── Lógica principal por período ─────────────────────────────────────────
  async function procesarPeriodo(periodo, tipo, sfx) {
    const tiposNuevos = (tipo || '').split(';').map(t => t.trim()).filter(Boolean);

    const montosNuevos = {};
    tiposNuevos.forEach(concepto => {
      const campoMonto = CONCEPTO_A_MONTO[concepto];
      if (campoMonto) {
        const key = sfx === 1 ? campoMonto : campoMonto + '_' + sfx;
        if (p[key]) montosNuevos[campoMonto] = p[key];
      }
    });

    const ticketExistente = await buscarTicketExistente(periodo);

    if (ticketExistente) {
      const ticketId = String(ticketExistente.id);

      const tiposActuales = (ticketExistente.properties.tipo_de_incumplimiento || '')
        .split(';').map(t => t.trim()).filter(Boolean);

      const tiposRealmenteNuevos = tiposNuevos.filter(t => !tiposActuales.includes(t));
      const tiposMergeados = [...new Set([...tiposActuales, ...tiposNuevos])];

      await api('PATCH', '/crm/v3/objects/tickets/' + ticketId, {
        properties: {
          tipo_de_incumplimiento: tiposMergeados.join(';'),
          ...montosNuevos
        }
      });

      if (tiposRealmenteNuevos.length > 0 || Object.keys(montosNuevos).length > 0) {
        await crearNota(ticketId, tiposNuevos, montosNuevos);
      }

      await crearNotaArchivos(ticketId);

      return 'actualizado';

    } else {
      const props = {
        subject:                           'Incumplimiento — ' + p.nombre_y_apellido_del_inquilino + ' | ' + periodo,
        hs_pipeline:                       '4056971510',
        hs_pipeline_stage:                 '5908617454',
        nombre_y_apellido_del_inquilino:   p.nombre_y_apellido_del_inquilino || '',
        dni_inquilino:                     p.dni_inquilino || '',
        periodo_de_deuda:                  periodo,
        tipo_de_incumplimiento:            tiposNuevos.join(';'),
        alias_cbu_impagos:                 [p.alias_cbu_impagos, p.alias_impagos].filter(Boolean).join(' | '),
        banco:                             p.banco || '',
        content:                           p.observaciones_incumplimiento || '',
        nombre_y_apellido_del_propietario: p.nombre_y_apellido_del_propietario || '',
        cuit_cuil:                         p.cuit_cuil || '',
        ...montosNuevos,
        ...(ownerIdParaUsar ? { hubspot_owner_id: ownerIdParaUsar } : {})
      };

      const r = await api('POST', '/crm/v3/objects/tickets', { properties: props });
      if (r.s !== 201) throw new Error('Error creando ticket ' + periodo + ': ' + JSON.stringify(r.b));

      const ticketId = String(r.b.id);

      await api('PUT', '/crm/v4/objects/tickets/' + ticketId + '/associations/contacts/' + contactId, [
        { associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 16 }
      ]);

      if (companyId) {
        await api('PUT', '/crm/v4/objects/tickets/' + ticketId + '/associations/companies/' + companyId, [
          { associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 26 }
        ]);
      }

      await crearNotaArchivos(ticketId);

      return 'creado';
    }
  }

  // ── Ejecutar para cada período ───────────────────────────────────────────
  const numPeriodos = Math.min(4, parseInt(p.num_periodos_incumplimiento || '4', 10) || 4);

  let creados = 0;
  let actualizados = 0;

  if (p.periodo_de_deuda && numPeriodos >= 1) {
    const res = await procesarPeriodo(p.periodo_de_deuda, p.tipo_de_incumplimiento, 1);
    res === 'creado' ? creados++ : actualizados++;
  }

  for (let sfx = 2; sfx <= numPeriodos; sfx++) {
    const per = p['periodo_de_deuda_' + sfx];
    if (per) {
      const res = await procesarPeriodo(per, p['tipo_de_incumplimiento_' + sfx], sfx);
      res === 'creado' ? creados++ : actualizados++;
    }
  }

  callback({ outputFields: { tickets_creados: creados, tickets_actualizados: actualizados } });
};
