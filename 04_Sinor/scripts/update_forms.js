const https = require('https');
const TOKEN = process.env.HUBSPOT_TOKEN;

// Opciones por propiedad (mismo set que las propiedades)
const OPTS = {
  visita_estado_cartera: [
    {label: 'Nueva',    value: 'NUEVA'},
    {label: 'Activa',   value: 'ACTIVA'},
    {label: 'Pasiva',   value: 'PASIVA'},
    {label: 'Inactiva', value: 'INACTIVA'},
    {label: 'Perdida',  value: 'PERDIDA'}
  ],
  visita_motivo_perdida: [
    {label: 'Precio de la garantía',             value: 'precio_garantia'},
    {label: 'Participación',                      value: 'participacion'},
    {label: 'Mejor propuesta de la competencia', value: 'propuesta_competencia'},
    {label: 'Problemas de servicio',             value: 'problemas_servicio'},
    {label: 'Tiempos de respuesta de OC',        value: 'tiempos_oc'},
    {label: 'Problema con Área',                 value: 'problemas_area'},
    {label: 'Deja de dedicarse a Alquileres',    value: 'deja_alquileres'},
    {label: 'Cierre definitivo de Inmobiliaria', value: 'cierre_definitivo'},
    {label: 'Otro',                              value: 'otro'}
  ],
  visita_condiciones_competencia: [
    {label: 'Participación',            value: 'participacion'},
    {label: 'Tiempos / Atención OC',    value: 'tiempos'},
    {label: 'Problemas con Áreas',      value: 'problemas_areas'},
    {label: 'Beneficios diferenciales', value: 'beneficios'}
  ],
  visita_continuidad: [
    {label: 'Sí', value: 'si'},
    {label: 'No', value: 'no'}
  ],
  visita_satisfaccion: [
    {label: '100%', value: '100'},
    {label: '50%',  value: '50'},
    {label: '25%',  value: '25'},
    {label: '0%',   value: '0'}
  ],
  visita_tipo_observacion: [
    {label: 'Oficial de Cuenta',  value: 'oc'},
    {label: 'Oficina Comercial',  value: 'oficina_comercial'},
    {label: 'Prejudicial',        value: 'prejudicial'},
    {label: 'Judicial',           value: 'judicial'},
    {label: 'Incumplimientos',    value: 'incumplimientos'},
    {label: 'Otros',              value: 'otros'}
  ],
  visita_conocimiento_servicio: [
    {label: 'Sí',           value: 'si'},
    {label: 'Parcialmente', value: 'parcialmente'},
    {label: 'No',           value: 'no'}
  ],
  visita_alertas_desvio: [
    {label: 'Ingreso de competencia nueva',         value: 'competencia_nueva'},
    {label: 'Competencia mejor posicionada',        value: 'competencia_mejor'},
    {label: 'Pérdida parcial del cliente',          value: 'perdida_parcial'},
    {label: 'Pérdida total del cliente',            value: 'perdida_total'},
    {label: 'Disminución de inmuebles en alquiler', value: 'disminucion'}
  ],
  visita_nueva_competencia: [
    {label: 'Sí', value: 'si'},
    {label: 'No', value: 'no'}
  ],
  visita_proxima_accion: [
    {label: 'Visita Comercial',                         value: 'visita'},
    {label: 'Presentación de propuesta',                value: 'propuesta'},
    {label: 'Capacitación / Actualización de servicio', value: 'capacitacion'}
  ],
  visita_resultado_gestion: [
    {label: 'Relación consolidada',      value: 'consolidada'},
    {label: 'Riesgo detectado',          value: 'riesgo'},
    {label: 'Acción correctiva en curso',value: 'correctiva'}
  ],
  visita_motivos_inactividad: [
    {label: 'Precio de nuestro servicio',         value: 'precio'},
    {label: 'Comisión',                           value: 'comision'},
    {label: 'Tiempos de respuesta de OC',         value: 'tiempos_oc'},
    {label: 'Gestión con Área',                   value: 'gestion_area'},
    {label: 'Dejan rubro de alquiler',            value: 'dejan_rubro'},
    {label: 'Cierre de Inmobiliaria Definitivo',  value: 'cierre_definitivo'},
    {label: 'Falta de conocimiento del servicio', value: 'falta_conocimiento'}
  ],
  visita_propuesta_reactivacion: [
    {label: 'Sí', value: 'si'},
    {label: 'No', value: 'no'}
  ],
  visita_nivel_interes: [
    {label: 'Alto',  value: 'alto'},
    {label: 'Medio', value: 'medio'},
    {label: 'Bajo',  value: 'bajo'},
    {label: 'Nulo',  value: 'nulo'}
  ],
  visita_proximo_paso_pasiva: [
    {label: 'Llamada de seguimiento',       value: 'llamada'},
    {label: 'Envío de nueva propuesta',     value: 'propuesta'},
    {label: 'Capacitación confirmada',      value: 'capacitacion'},
    {label: 'Esperar decisión del cliente', value: 'esperar'}
  ],
  visita_origen_contacto: [
    {label: 'Prospección comercial', value: 'prospeccion_comercial'},
    {label: 'Web / Inbound',         value: 'web_inbound'},
    {label: 'Evento',                value: 'evento'},
    {label: 'Contacto espontáneo',   value: 'contacto_espontaneo'},
    {label: 'Otro',                  value: 'otro'}
  ],
  visita_nueva_condiciones: [
    {label: 'Destaca la cobertura', value: 'cobertura'},
    {label: 'Participación (%)',    value: 'participacion'},
    {label: 'Costo de Fianza',      value: 'fianza'},
    {label: 'Prioriza Propietario', value: 'propietario'},
    {label: 'Prioriza Inquilino',   value: 'inquilino'}
  ],
  visita_volumen_potencial: [
    {label: 'Alto',  value: 'alto'},
    {label: 'Medio', value: 'medio'},
    {label: 'Bajo',  value: 'bajo'}
  ],
  visita_exclusividad: [
    {label: 'Mixto',                 value: 'mixto'},
    {label: 'Exclusivo competencia', value: 'exclusivo'}
  ],
  visita_presentacion_nueva: [
    {label: 'Kit de bienvenida con información de la compañía', value: 'kit'},
    {label: 'Presentación de servicio',                         value: 'servicio'},
    {label: 'Capacitación / SAI',                               value: 'capacitacion'},
    {label: 'Diferenciales con la competencia',                 value: 'diferenciales'}
  ],
  visita_vigencia_cliente: [
    {label: 'Sí', value: 'si'},
    {label: 'No', value: 'no'}
  ],
  visita_potencial_comercial: [
    {label: 'Medio', value: 'medio'},
    {label: 'Bajo',  value: 'bajo'}
  ],
  visita_motivo_falta_operacion: [
    {label: 'Se dedica únicamente a la venta', value: 'solo_venta'},
    {label: 'Trabaja con título propietario',  value: 'titulo_propietario'},
    {label: 'Trabaja con la competencia',      value: 'competencia'},
    {label: 'Inconformidad con FINAER',        value: 'inconformidad_finaer'}
  ],
  visita_decision_inactiva: [
    {label: 'Intentar reactivación',   value: 'reactivar'},
    {label: 'Mantener en observación', value: 'observacion'},
    {label: 'Cerrar definitivamente',  value: 'cerrar'}
  ],
  visita_datos_actualizados: [
    {label: 'Sí', value: 'si'},
    {label: 'No', value: 'no'}
  ]
};

const FORMS = [
  {id: '87e8826e-d3ee-40b9-8c6f-43c7f7bc79e0', name: 'Nueva'},
  {id: 'd6c9f335-6294-49aa-b45a-d438c0cf3b01', name: 'Activa'},
  {id: '911cfc9b-d7ed-475e-9996-5a5eff800d8d', name: 'Pasiva'},
  {id: 'c364bc13-5096-4ebe-94b2-0dc189b4dcc7', name: 'Inactiva'},
  {id: '5d66904e-89fc-4db1-917c-f0c2e3c70ede', name: 'Perdida'}
];

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json; charset=utf-8'
    };
    if (data) headers['Content-Length'] = data.length;
    const req = https.request({ hostname: 'api.hubapi.com', path, method, headers }, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function injectOptions(fieldGroups) {
  return fieldGroups.map(group => ({
    ...group,
    fields: group.fields.map(field => {
      if (OPTS[field.name]) {
        const opts = OPTS[field.name].map((o, i) => ({
          label: o.label,
          value: o.value,
          displayOrder: i
        }));
        return { ...field, options: opts };
      }
      return field;
    })
  }));
}

async function updateForm(formId, formName) {
  const form = await apiRequest('GET', '/marketing/v3/forms/' + formId);
  const updatedGroups = injectOptions(form.fieldGroups || []);
  const result = await apiRequest('PATCH', '/marketing/v3/forms/' + formId, {
    fieldGroups: updatedGroups
  });
  return result.id ? 'OK' : (result.message || JSON.stringify(result));
}

async function run() {
  for (const f of FORMS) {
    try {
      const status = await updateForm(f.id, f.name);
      console.log((status === 'OK' ? '✓' : '✗') + ' Formulario ' + f.name + (status !== 'OK' ? ' → ' + status : ''));
    } catch(e) {
      console.log('✗ Formulario ' + f.name + ' → ' + e.message);
    }
  }
  console.log('\nListo.');
}
run();
