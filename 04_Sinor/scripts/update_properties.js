const https = require('https');
const TOKEN = 'pat-eu1-87f3fc69-9f28-409b-9046-db09ef4e6d31';

const updates = {

  // PERDIDA
  visita_motivo_perdida: { options: [
    {label: 'Precio de la garantía',             value: 'precio_garantia',      hidden: false, displayOrder: 1},
    {label: 'Participación',                      value: 'participacion',         hidden: false, displayOrder: 2},
    {label: 'Mejor propuesta de la competencia', value: 'propuesta_competencia', hidden: false, displayOrder: 3},
    {label: 'Problemas de servicio',             value: 'problemas_servicio',    hidden: false, displayOrder: 4},
    {label: 'Tiempos de respuesta de OC',        value: 'tiempos_oc',            hidden: false, displayOrder: 5},
    {label: 'Problema con Área',                 value: 'problemas_area',        hidden: false, displayOrder: 6},
    {label: 'Deja de dedicarse a Alquileres',    value: 'deja_alquileres',       hidden: false, displayOrder: 7},
    {label: 'Cierre definitivo de Inmobiliaria', value: 'cierre_definitivo',     hidden: false, displayOrder: 8},
    {label: 'Otro',                              value: 'otro',                  hidden: false, displayOrder: 9}
  ]},

  visita_condiciones_competencia: { options: [
    {label: 'Participación',            value: 'participacion',   hidden: false, displayOrder: 1},
    {label: 'Tiempos / Atención OC',    value: 'tiempos',         hidden: false, displayOrder: 2},
    {label: 'Problemas con Áreas',      value: 'problemas_areas', hidden: false, displayOrder: 3},
    {label: 'Beneficios diferenciales', value: 'beneficios',      hidden: false, displayOrder: 4}
  ]},

  // ACTIVA
  visita_continuidad: { options: [
    {label: 'Sí', value: 'si', hidden: false, displayOrder: 1},
    {label: 'No', value: 'no', hidden: false, displayOrder: 2}
  ]},

  visita_satisfaccion: { options: [
    {label: '100%', value: '100', hidden: false, displayOrder: 1},
    {label: '50%',  value: '50',  hidden: false, displayOrder: 2},
    {label: '25%',  value: '25',  hidden: false, displayOrder: 3},
    {label: '0%',   value: '0',   hidden: false, displayOrder: 4}
  ]},

  visita_tipo_observacion: { options: [
    {label: 'Oficial de Cuenta',  value: 'oc',                hidden: false, displayOrder: 1},
    {label: 'Oficina Comercial',  value: 'oficina_comercial', hidden: false, displayOrder: 2},
    {label: 'Prejudicial',        value: 'prejudicial',       hidden: false, displayOrder: 3},
    {label: 'Judicial',           value: 'judicial',          hidden: false, displayOrder: 4},
    {label: 'Incumplimientos',    value: 'incumplimientos',   hidden: false, displayOrder: 5},
    {label: 'Otros',              value: 'otros',             hidden: false, displayOrder: 6}
  ]},

  visita_conocimiento_servicio: { options: [
    {label: 'Sí',           value: 'si',          hidden: false, displayOrder: 1},
    {label: 'Parcialmente', value: 'parcialmente', hidden: false, displayOrder: 2},
    {label: 'No',           value: 'no',           hidden: false, displayOrder: 3}
  ]},

  visita_alertas_desvio: { options: [
    {label: 'Ingreso de competencia nueva',         value: 'competencia_nueva', hidden: false, displayOrder: 1},
    {label: 'Competencia mejor posicionada',        value: 'competencia_mejor', hidden: false, displayOrder: 2},
    {label: 'Pérdida parcial del cliente',          value: 'perdida_parcial',   hidden: false, displayOrder: 3},
    {label: 'Pérdida total del cliente',            value: 'perdida_total',     hidden: false, displayOrder: 4},
    {label: 'Disminución de inmuebles en alquiler', value: 'disminucion',       hidden: false, displayOrder: 5}
  ]},

  visita_nueva_competencia: { options: [
    {label: 'Sí', value: 'si', hidden: false, displayOrder: 1},
    {label: 'No', value: 'no', hidden: false, displayOrder: 2}
  ]},

  visita_proxima_accion: { options: [
    {label: 'Visita Comercial',                         value: 'visita',      hidden: false, displayOrder: 1},
    {label: 'Presentación de propuesta',                value: 'propuesta',   hidden: false, displayOrder: 2},
    {label: 'Capacitación / Actualización de servicio', value: 'capacitacion',hidden: false, displayOrder: 3}
  ]},

  visita_resultado_gestion: { options: [
    {label: 'Relación consolidada',      value: 'consolidada', hidden: false, displayOrder: 1},
    {label: 'Riesgo detectado',          value: 'riesgo',      hidden: false, displayOrder: 2},
    {label: 'Acción correctiva en curso',value: 'correctiva',  hidden: false, displayOrder: 3}
  ]},

  // PASIVA
  visita_motivos_inactividad: { options: [
    {label: 'Precio de nuestro servicio',         value: 'precio',             hidden: false, displayOrder: 1},
    {label: 'Comisión',                           value: 'comision',           hidden: false, displayOrder: 2},
    {label: 'Tiempos de respuesta de OC',         value: 'tiempos_oc',         hidden: false, displayOrder: 3},
    {label: 'Gestión con Área',                   value: 'gestion_area',       hidden: false, displayOrder: 4},
    {label: 'Dejan rubro de alquiler',            value: 'dejan_rubro',        hidden: false, displayOrder: 5},
    {label: 'Cierre de Inmobiliaria Definitivo',  value: 'cierre_definitivo',  hidden: false, displayOrder: 6},
    {label: 'Falta de conocimiento del servicio', value: 'falta_conocimiento', hidden: false, displayOrder: 7}
  ]},

  visita_propuesta_reactivacion: { options: [
    {label: 'Sí', value: 'si', hidden: false, displayOrder: 1},
    {label: 'No', value: 'no', hidden: false, displayOrder: 2}
  ]},

  visita_nivel_interes: { options: [
    {label: 'Alto',  value: 'alto',  hidden: false, displayOrder: 1},
    {label: 'Medio', value: 'medio', hidden: false, displayOrder: 2},
    {label: 'Bajo',  value: 'bajo',  hidden: false, displayOrder: 3},
    {label: 'Nulo',  value: 'nulo',  hidden: false, displayOrder: 4}
  ]},

  visita_proximo_paso_pasiva: { options: [
    {label: 'Llamada de seguimiento',       value: 'llamada',     hidden: false, displayOrder: 1},
    {label: 'Envío de nueva propuesta',     value: 'propuesta',   hidden: false, displayOrder: 2},
    {label: 'Capacitación confirmada',      value: 'capacitacion',hidden: false, displayOrder: 3},
    {label: 'Esperar decisión del cliente', value: 'esperar',     hidden: false, displayOrder: 4}
  ]},

  // NUEVA
  visita_origen_contacto: { options: [
    {label: 'Prospección comercial', value: 'prospeccion_comercial', hidden: false, displayOrder: 1},
    {label: 'Web / Inbound',         value: 'web_inbound',           hidden: false, displayOrder: 2},
    {label: 'Evento',                value: 'evento',                hidden: false, displayOrder: 3},
    {label: 'Contacto espontáneo',   value: 'contacto_espontaneo',   hidden: false, displayOrder: 4},
    {label: 'Otro',                  value: 'otro',                  hidden: false, displayOrder: 5}
  ]},

  visita_nueva_condiciones: { options: [
    {label: 'Destaca la cobertura', value: 'cobertura',    hidden: false, displayOrder: 1},
    {label: 'Participación (%)',    value: 'participacion', hidden: false, displayOrder: 2},
    {label: 'Costo de Fianza',      value: 'fianza',        hidden: false, displayOrder: 3},
    {label: 'Prioriza Propietario', value: 'propietario',   hidden: false, displayOrder: 4},
    {label: 'Prioriza Inquilino',   value: 'inquilino',     hidden: false, displayOrder: 5}
  ]},

  visita_volumen_potencial: { options: [
    {label: 'Alto',  value: 'alto',  hidden: false, displayOrder: 1},
    {label: 'Medio', value: 'medio', hidden: false, displayOrder: 2},
    {label: 'Bajo',  value: 'bajo',  hidden: false, displayOrder: 3}
  ]},

  visita_exclusividad: { options: [
    {label: 'Mixto',                 value: 'mixto',    hidden: false, displayOrder: 1},
    {label: 'Exclusivo competencia', value: 'exclusivo',hidden: false, displayOrder: 2}
  ]},

  visita_presentacion_nueva: { options: [
    {label: 'Kit de bienvenida con información de la compañía', value: 'kit',          hidden: false, displayOrder: 1},
    {label: 'Presentación de servicio',                         value: 'servicio',     hidden: false, displayOrder: 2},
    {label: 'Capacitación / SAI',                               value: 'capacitacion', hidden: false, displayOrder: 3},
    {label: 'Diferenciales con la competencia',                 value: 'diferenciales',hidden: false, displayOrder: 4}
  ]},

  // INACTIVA
  visita_vigencia_cliente: { options: [
    {label: 'Sí', value: 'si', hidden: false, displayOrder: 1},
    {label: 'No', value: 'no', hidden: false, displayOrder: 2}
  ]},

  visita_potencial_comercial: { options: [
    {label: 'Medio', value: 'medio', hidden: false, displayOrder: 1},
    {label: 'Bajo',  value: 'bajo',  hidden: false, displayOrder: 2}
  ]},

  visita_motivo_falta_operacion: { options: [
    {label: 'Se dedica únicamente a la venta', value: 'solo_venta',           hidden: false, displayOrder: 1},
    {label: 'Trabaja con título propietario',  value: 'titulo_propietario',   hidden: false, displayOrder: 2},
    {label: 'Trabaja con la competencia',      value: 'competencia',          hidden: false, displayOrder: 3},
    {label: 'Inconformidad con FINAER',        value: 'inconformidad_finaer', hidden: false, displayOrder: 4}
  ]},

  visita_decision_inactiva: { options: [
    {label: 'Intentar reactivación',   value: 'reactivar',   hidden: false, displayOrder: 1},
    {label: 'Mantener en observación', value: 'observacion', hidden: false, displayOrder: 2},
    {label: 'Cerrar definitivamente',  value: 'cerrar',      hidden: false, displayOrder: 3}
  ]},

  visita_datos_actualizados: { options: [
    {label: 'Sí', value: 'si', hidden: false, displayOrder: 1},
    {label: 'No', value: 'no', hidden: false, displayOrder: 2}
  ]},

  visita_estado_cartera: { options: [
    {label: 'Nueva',    value: 'NUEVA',    hidden: false, displayOrder: 1},
    {label: 'Activa',   value: 'ACTIVA',   hidden: false, displayOrder: 2},
    {label: 'Pasiva',   value: 'PASIVA',   hidden: false, displayOrder: 3},
    {label: 'Inactiva', value: 'INACTIVA', hidden: false, displayOrder: 4},
    {label: 'Perdida',  value: 'PERDIDA',  hidden: false, displayOrder: 5}
  ]}
};

function patchProperty(name, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body), 'utf8');
    const req = https.request({
      hostname: 'api.hubapi.com',
      path: '/crm/v3/properties/contacts/' + name,
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': data.length
      }
    }, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try {
          const r = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          resolve({name, ok: !!r.name, msg: r.name ? 'OK' : r.message});
        } catch(e) { resolve({name, ok: false, msg: e.message}); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  for (const [name, body] of Object.entries(updates)) {
    const r = await patchProperty(name, body);
    console.log((r.ok ? '✓' : '✗') + ' ' + r.name + (r.ok ? '' : ' → ' + r.msg));
  }
  console.log('\nListo.');
}
run();
