// wf_acumular_recursos_humand.js
// WF: "Humand — Acumular Recursos"
// Trigger: Contacto con recursos_inscribir_humand conocido (re-enrollment al cambiar)
//
// Lógica:
//   1. Lee el nuevo envío del formulario (recursos_inscribir_humand)
//   2. Lee el acumulado histórico (recursos_acumulados_humand)
//   3. Une ambos sin duplicar
//   4. Actualiza recursos_acumulados_humand con el resultado

const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {
  const client = new hubspot.Client({ accessToken: process.env.token });

  const contactId   = String(event.object.objectId);
  const nuevosRaw   = event.inputFields['recursos_inscribir_humand']   || '';
  const previosRaw  = event.inputFields['recursos_acumulados_humand']  || '';

  const nuevos  = nuevosRaw.split(';').map(r => r.trim().toLowerCase()).filter(Boolean);
  const previos = previosRaw.split(';').map(r => r.trim().toLowerCase()).filter(Boolean);

  const acumulado = [...new Set([...previos, ...nuevos])].join(';');

  await client.crm.contacts.basicApi.update(contactId, {
    properties: { recursos_acumulados_humand: acumulado }
  });

  return callback({
    outputFields: {
      resultado: `OK — ${acumulado.split(';').length} recursos acumulados`
    }
  });
};
