const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();
const BASE = 'https://api.hubapi.com/marketing/v3/forms';

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
const f = (name, label, fieldType, extra = {}) => ({ objectTypeId: '0-1', name, label, required: false, hidden: false, fieldType, ...extra });
const email = (label) => ({ objectTypeId: '0-1', name: 'email', label, required: true, hidden: false, fieldType: 'email', validation: { blockedEmailDomains: [], useDefaultBlockList: false } });
const bool = (name, label) => f(name, label, 'radio');

const forms = {

  // ── ACTIVAS ──────────────────────────────────────────────────────────
  'd6c9f335-6294-49aa-b45a-d438c0cf3b01': {
    name: 'Visita Comercial - ACTIVA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Activa'),
      g([email('Correo')]),
      g([f('visita_satisfaccion', '1. Nivel de Fidelizacion', 'dropdown')]),
      g([f('visita_tipo_observacion', 'Tipo de insatisfaccion (si aplica)', 'dropdown')]),
      g([bool('visita_newsletter', '2. Adherido a Newsletter?')]),
      g([bool('visita_conoce_sai', 'Conoce el SAI?')]),
      g([bool('visita_conoce_plan_matricula', 'Conoce el plan matricula?')]),
      g([f('visita_obs_satisfaccion', 'Detalle', 'multi_line_text')]),
      g([f('visita_alertas_desvio', '3. Alertas de desvio negativo', 'multiple_checkboxes')]),
      g([f('visita_detalle_alerta', 'Detalle de la situacion', 'multi_line_text')]),
      g([f('visita_resultado_gestion', '4. Resultado de la gestion', 'dropdown')]),
      g([f('visita_fecha_proxima_presencial', '5. Proxima visita', 'single_line_text')]),
      g([f('visita_fecha_otros_canales', 'Contacto otros canales (opcional)', 'single_line_text')]),
      g([bool('visita_merch', 'Brindo merch?')])
    ]
  },

  // ── PASIVAS ──────────────────────────────────────────────────────────
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
      g([bool('visita_merch', 'Brindo merch?')])
    ]
  },

  // ── INACTIVAS ─────────────────────────────────────────────────────────
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
      g([bool('visita_merch', 'Brindo merch?')])
    ]
  },

  // ── PERDIDAS ──────────────────────────────────────────────────────────
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
      g([bool('visita_merch', 'Brindo merch?')])
    ]
  },

  // ── NUEVA ─────────────────────────────────────────────────────────────
  '87e8826e-d3ee-40b9-8c6f-43c7f7bc79e0': {
    name: 'Visita Comercial - NUEVA',
    fieldGroups: [
      g(hidden),
      titulo('Visita Comercial — Inmobiliaria Nueva'),
      g([email('Correo')]),
      g([f('visita_origen_contacto', '1. Origen del contacto', 'dropdown')]),
      g([f('visita_nueva_condiciones', '2. Condiciones para operar', 'multiple_checkboxes')]),
      g([f('visita_volumen_potencial', '3. Administra propiedad?', 'dropdown')]),
      g([f('visita_competidores_actuales', '4. Competidores actuales', 'single_line_text')]),
      g([f('visita_fecha_proxima_presencial', '5. Fecha de proxima visita', 'single_line_text')]),
      g([f('visita_fecha_otros_canales', 'Contacto otros canales (opcional)', 'single_line_text')]),
      g([f('visita_obs_satisfaccion', '6. Observaciones / Detalles', 'multi_line_text')]),
      g([bool('visita_merch', 'Brindo merch?')])
    ]
  }
};

async function patch(id, body) {
  const r = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  if (d.id) console.log(`✅ ${d.name}`);
  else console.error(`❌ ${id}:`, JSON.stringify(d).slice(0, 200));
}

(async () => {
  for (const [id, body] of Object.entries(forms)) await patch(id, body);
})();
