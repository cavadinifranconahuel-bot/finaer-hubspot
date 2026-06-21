const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();
const BASE = 'https://api.hubapi.com/marketing/v3/forms';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const patch = async (id, body) => {
  const r = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  if (!d.id) throw new Error(JSON.stringify(d).slice(0, 200));
  return d;
};

const hidden = [
  { objectTypeId: '0-1', name: 'visita_empresa_id', label: 'ID Empresa', required: false, hidden: true, fieldType: 'single_line_text' },
  { objectTypeId: '0-1', name: 'visita_empresa_nombre', label: 'Nombre Empresa', required: false, hidden: true, fieldType: 'single_line_text' },
  { objectTypeId: '0-1', name: 'visita_estado_cartera', label: 'Estado Cartera', required: false, hidden: true, fieldType: 'dropdown', options: [
    { label: 'Nueva', value: 'NUEVA', displayOrder: 0 },
    { label: 'Activa', value: 'ACTIVA', displayOrder: 1 },
    { label: 'Pasiva', value: 'PASIVA', displayOrder: 2 },
    { label: 'Inactiva', value: 'INACTIVA', displayOrder: 3 },
    { label: 'Perdida', value: 'PERDIDA', displayOrder: 4 }
  ]}
];

const g = (fields) => ({ groupType: 'default_group', richTextType: 'text', fields });
const titulo = (txt) => ({ groupType: 'default_group', richTextType: 'text', richText: `<h2>${txt}</h2>`, fields: [] });
const f = (name, label, fieldType, options = null) => ({
  objectTypeId: '0-1', name, label, required: false, hidden: false, fieldType,
  ...(options ? { options } : {})
});
const email = (label) => ({ objectTypeId: '0-1', name: 'email', label, required: true, hidden: false, fieldType: 'email', validation: { blockedEmailDomains: [], useDefaultBlockList: false } });

const opcionesBoolean = [
  { label: 'Si', value: 'true', displayOrder: 0 },
  { label: 'No', value: 'false', displayOrder: 1 }
];

// Estado BASE de cada formulario (sin los campos nuevos)
const base = {
  'd6c9f335-6294-49aa-b45a-d438c0cf3b01': {
    name: 'Visita Comercial - ACTIVA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Activa'),
      g([email('Correo')]),
      g([f('visita_satisfaccion', '1. Nivel de Fidelizacion', 'dropdown')]),
      g([f('visita_tipo_observacion', 'Tipo de insatisfaccion (si aplica)', 'dropdown')]),
      g([f('visita_obs_satisfaccion', 'Detalle', 'multi_line_text')]),
      g([f('visita_alertas_desvio', '3. Alertas de desvio negativo', 'multiple_checkboxes')]),
      g([f('visita_detalle_alerta', 'Detalle de la situacion', 'multi_line_text')]),
      g([f('visita_resultado_gestion', '4. Resultado de la gestion', 'dropdown')]),
      g([f('visita_fecha_proxima_presencial', '5. Proxima visita', 'single_line_text')]),
      g([f('visita_fecha_otros_canales', 'Contacto otros canales (opcional)', 'single_line_text')])
    ]
  },
  '911cfc9b-d7ed-475e-9996-5a5eff800d8d': {
    name: 'Visita Comercial - PASIVA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Pasiva'),
      g([f('visita_motivos_inactividad', '1. Motivo de Pasividad', 'multiple_checkboxes')]),
      g([f('visita_detalle_motivo', 'Detalle de cada motivo', 'multi_line_text')]),
      g([f('visita_competencia_actual', '2. Competencia actual', 'single_line_text')]),
      g([f('visita_nivel_interes', '3. Nivel de interes con FINAER', 'dropdown')]),
      g([f('visita_detalle_proximo_paso', '4. Plan de acciones', 'multi_line_text')]),
      g([f('visita_detalle_visita', '5. Detalle del contenido de la visita', 'multi_line_text')]),
      g([f('visita_fecha_reactivacion', '6. Fecha de reactivacion', 'single_line_text')])
    ]
  },
  'c364bc13-5096-4ebe-94b2-0dc189b4dcc7': {
    name: 'Visita Comercial - INACTIVA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Inactiva'),
      g([f('visita_vigencia_cliente', '1. Tiene inmobiliaria a la calle?', 'dropdown')]),
      g([f('visita_nivel_interes', '2. Interes en la visita', 'dropdown')]),
      g([f('visita_motivo_falta_operacion', '3. Motivo de falta de operacion', 'dropdown')]),
      g([f('visita_decision_inactiva', '4. Proximas acciones', 'dropdown')]),
      g([f('visita_fecha_seguimiento', '5. Proxima visita', 'single_line_text')]),
      g([f('visita_datos_actualizados', '6. Datos de contacto actualizados?', 'dropdown')])
    ]
  },
  '5d66904e-89fc-4db1-917c-f0c2e3c70ede': {
    name: 'Visita Comercial - PERDIDA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Perdida'),
      g([f('visita_motivo_perdida', '1. Motivo de perdida', 'dropdown')]),
      g([email('Correo del Oficial de Cuenta')]),
      g([f('visita_detalle_perdida', '1.1 Detalle del motivo', 'multi_line_text')]),
      g([f('visita_empresa_competidora', '2. Empresa competidora', 'single_line_text')]),
      g([f('visita_condiciones_competencia', '3. Por que elige la competencia', 'multiple_checkboxes')]),
      g([f('visita_condiciones_volver', '4. Condiciones necesarias para volver', 'multi_line_text')]),
      g([f('visita_detalle_final', '5. Detalle final y conclusiones', 'multi_line_text')]),
      g([f('visita_fecha_presencial_perdida', '6. Fecha reactivacion presencial', 'single_line_text')])
    ]
  },
  '87e8826e-d3ee-40b9-8c6f-43c7f7bc79e0': {
    name: 'Visita Comercial - NUEVA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Nueva'),
      g([email('Correo')]),
      g([f('visita_competidores_actuales', '4. Competidores actuales', 'single_line_text')]),
      g([f('visita_fecha_proxima_presencial', '5. Fecha de proxima visita', 'single_line_text')]),
      g([f('visita_fecha_otros_canales', 'Contacto otros canales (opcional)', 'single_line_text')])
    ]
  }
};

// Estado COMPLETO con campos nuevos y opciones explícitas
const completo = {
  'd6c9f335-6294-49aa-b45a-d438c0cf3b01': {
    name: 'Visita Comercial - ACTIVA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Activa'),
      g([email('Correo')]),
      g([f('visita_satisfaccion', '1. Nivel de Fidelizacion', 'dropdown')]),
      g([f('visita_tipo_observacion', 'Tipo de insatisfaccion (si aplica)', 'dropdown')]),
      g([f('visita_newsletter', '2. Adherido a Newsletter?', 'radio', opcionesBoolean)]),
      g([f('visita_conoce_sai', 'Conoce el SAI?', 'radio', opcionesBoolean)]),
      g([f('visita_conoce_plan_matricula', 'Conoce el plan matricula?', 'radio', opcionesBoolean)]),
      g([f('visita_obs_satisfaccion', 'Detalle', 'multi_line_text')]),
      g([f('visita_alertas_desvio', '3. Alertas de desvio negativo', 'multiple_checkboxes')]),
      g([f('visita_detalle_alerta', 'Detalle de la situacion', 'multi_line_text')]),
      g([f('visita_resultado_gestion', '4. Resultado de la gestion', 'dropdown')]),
      g([f('visita_fecha_proxima_presencial', '5. Proxima visita', 'single_line_text')]),
      g([f('visita_fecha_otros_canales', 'Contacto otros canales (opcional)', 'single_line_text')]),
      g([f('visita_merch', 'Brindo merch?', 'radio', opcionesBoolean)])
    ]
  },
  '911cfc9b-d7ed-475e-9996-5a5eff800d8d': {
    name: 'Visita Comercial - PASIVA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Pasiva'),
      g([f('visita_motivos_inactividad', '1. Motivo de Pasividad', 'multiple_checkboxes')]),
      g([f('visita_detalle_motivo', 'Detalle de cada motivo', 'multi_line_text')]),
      g([f('visita_competencia_actual', '2. Competencia actual', 'single_line_text')]),
      g([f('visita_nivel_interes', '3. Nivel de interes con FINAER', 'dropdown')]),
      g([f('visita_detalle_proximo_paso', '4. Plan de acciones', 'multi_line_text')]),
      g([f('visita_detalle_visita', '5. Detalle del contenido de la visita', 'multi_line_text')]),
      g([f('visita_fecha_reactivacion', '6. Fecha de reactivacion', 'single_line_text')]),
      g([f('visita_merch', 'Brindo merch?', 'radio', opcionesBoolean)])
    ]
  },
  'c364bc13-5096-4ebe-94b2-0dc189b4dcc7': {
    name: 'Visita Comercial - INACTIVA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Inactiva'),
      g([f('visita_vigencia_cliente', '1. Tiene inmobiliaria a la calle?', 'dropdown')]),
      g([f('visita_nivel_interes', '2. Interes en la visita', 'dropdown')]),
      g([f('visita_motivo_falta_operacion', '3. Motivo de falta de operacion', 'dropdown')]),
      g([f('visita_decision_inactiva', '4. Proximas acciones', 'dropdown')]),
      g([f('visita_fecha_seguimiento', '5. Proxima visita', 'single_line_text')]),
      g([f('visita_datos_actualizados', '6. Datos de contacto actualizados?', 'dropdown')]),
      g([f('visita_merch', 'Brindo merch?', 'radio', opcionesBoolean)])
    ]
  },
  '5d66904e-89fc-4db1-917c-f0c2e3c70ede': {
    name: 'Visita Comercial - PERDIDA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Perdida'),
      g([f('visita_motivo_perdida', '1. Motivo de perdida', 'dropdown')]),
      g([email('Correo del Oficial de Cuenta')]),
      g([f('visita_detalle_perdida', '1.1 Detalle del motivo', 'multi_line_text')]),
      g([f('visita_empresa_competidora', '2. Empresa competidora', 'single_line_text')]),
      g([f('visita_condiciones_competencia', '3. Por que elige la competencia', 'multiple_checkboxes')]),
      g([f('visita_condiciones_volver', '4. Condiciones necesarias para volver', 'multi_line_text')]),
      g([f('visita_detalle_final', '5. Detalle final y conclusiones', 'multi_line_text')]),
      g([f('visita_fecha_presencial_perdida', '6. Fecha reactivacion presencial', 'single_line_text')]),
      g([f('visita_merch', 'Brindo merch?', 'radio', opcionesBoolean)])
    ]
  },
  '87e8826e-d3ee-40b9-8c6f-43c7f7bc79e0': {
    name: 'Visita Comercial - NUEVA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Nueva'),
      g([email('Correo')]),
      g([f('visita_origen_contacto', '1. Origen del contacto', 'dropdown', [
        { label: 'Oficina Comercial', value: 'oficina_comercial', displayOrder: 0 },
        { label: 'Evento', value: 'evento', displayOrder: 1 },
        { label: 'Ejecutivo de Cuenta', value: 'ejecutivo_cuenta', displayOrder: 2 },
        { label: 'Referido por Inmobiliaria', value: 'referido_inmobiliaria', displayOrder: 3 },
        { label: 'Pagina Web', value: 'pagina_web', displayOrder: 4 }
      ])]),
      g([f('visita_nueva_condiciones', '2. Condiciones para operar', 'multiple_checkboxes', [
        { label: 'Velocidad para operar', value: 'velocidad', displayOrder: 0 },
        { label: 'Participacion (%)', value: 'participacion', displayOrder: 1 },
        { label: 'Costo de Fianza', value: 'fianza', displayOrder: 2 },
        { label: 'Prioriza Inquilino', value: 'inquilino', displayOrder: 3 }
      ])]),
      g([f('visita_volumen_potencial', '3. Administra propiedad?', 'dropdown')]),
      g([f('visita_competidores_actuales', '4. Competidores actuales', 'single_line_text')]),
      g([f('visita_fecha_proxima_presencial', '5. Fecha de proxima visita', 'single_line_text')]),
      g([f('visita_fecha_otros_canales', 'Contacto otros canales (opcional)', 'single_line_text')]),
      g([f('visita_obs_satisfaccion', '6. Observaciones / Detalles', 'multi_line_text')]),
      g([f('visita_merch', 'Brindo merch?', 'radio', opcionesBoolean)])
    ]
  }
};

(async () => {
  for (const id of Object.keys(base)) {
    const nombre = base[id].name;
    try {
      // Paso 1: eliminar campos nuevos
      await patch(id, base[id]);
      console.log(`  🗑️  ${nombre} — campos nuevos eliminados`);
      await sleep(2000);

      // Paso 2: volver a agregar con opciones explícitas
      await patch(id, completo[id]);
      console.log(`  ✅  ${nombre} — campos nuevos re-agregados con opciones`);
      await sleep(1000);
    } catch (e) {
      console.error(`  ❌  ${nombre}: ${e.message}`);
    }
  }
  console.log('\nListo.');
})();
