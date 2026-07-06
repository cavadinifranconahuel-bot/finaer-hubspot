// actualizar_landing_eventos.js
// Cambios en landing-registros-eventos-finaer:
//   1. Activa el rich text oculto (row 1) con el nuevo texto de Mendoza
//   2. Cambia el form a "Formulario Evento Test" (a94e2078)
// Guarda como DRAFT — no publica. Franco publica desde la UI.

const TOKEN       = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const LP_ID       = '366631027916';
const FORM_NUEVO  = 'a94e2078-7d39-42e6-a6ca-5a487bb0578b';

const TEXTO_NUEVO = `<p style="font-size:17px;color:#333;text-align:center;margin-bottom:8px;">
  <strong>¡Finaer llega a Mendoza!</strong> Y lo hace con un evento que marcará la agenda del sector inmobiliario.
</p>
<p style="font-size:15px;color:#555;text-align:center;margin-top:0;">
  Si sos parte del mundo inmobiliario, este es un encuentro que no podés perderte.<br>
  <strong>Inscribite ahora. Cupos limitados.</strong>
</p>`;

async function main() {
  const fetch = (await import('node-fetch')).default;
  const h = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  // 1. GET landing actual
  const res  = await fetch(`https://api.hubapi.com/cms/v3/pages/landing-pages/${LP_ID}`, { headers: h });
  const lp   = await res.json();

  const sections = lp.layoutSections;
  const dnd      = sections.dnd_area;

  // Mostrar estado actual antes de cambiar
  console.log('=== ESTADO ACTUAL ===');
  console.log(`Form actual: ${dnd.rows[2]["0"].rows[0]["0"].params.form.form_id}`);
  console.log(`Rich text row 1 (hidden=${dnd.rowMetaData[1]?.styles?.breakpointStyles?.default?.hidden}): "${dnd.rows[1]["0"].rows[0]["0"].params.richTextContentHTML?.substring(0, 60)}"`);

  // 2. CAMBIO A: Activar rich text row 1 y poner texto nuevo
  dnd.rowMetaData[1].styles.breakpointStyles.default = { hidden: false };
  dnd.rows[1]["0"].rows[0]["0"].params.richTextContentHTML = TEXTO_NUEVO;

  // 3. CAMBIO B: Cambiar form_id
  dnd.rows[2]["0"].rows[0]["0"].params.form.form_id = FORM_NUEVO;

  console.log('\n=== CAMBIOS A APLICAR ===');
  console.log(`Form nuevo: ${FORM_NUEVO} (Formulario Evento Test)`);
  console.log(`Texto nuevo: ${TEXTO_NUEVO.replace(/<[^>]+>/g, '').trim().substring(0, 120)}`);

  // 4. PATCH al draft
  const patchRes = await fetch(`https://api.hubapi.com/cms/v3/pages/landing-pages/${LP_ID}/draft`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ layoutSections: sections })
  });

  if (!patchRes.ok) {
    const err = await patchRes.json();
    console.error('\n❌ ERROR:', JSON.stringify(err, null, 2));
    process.exit(1);
  }

  const result = await patchRes.json();
  console.log(`\n✅ Draft actualizado. ID: ${result.id}`);
  console.log(`   Estado: ${result.state}`);
  console.log(`   URL: ${result.url}`);
  console.log('\nPublicar desde HubSpot UI cuando confirmes que el draft se ve bien.');
}

main().catch(e => { console.error(e); process.exit(1); });
