const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env', 'utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();

// ⚠️ SOLO PARA TEST — el token en frontend no va a producción
const headHtml = `<style>
  @media (max-width: 768px) {
    .mobile-form-wrapper {
      max-width: 100% !important;
      width: 100% !important;
      padding: 0 1rem;
      margin: 0 !important;
      box-sizing: border-box;
    }
  }

  .dni-lookup-wrapper {
    max-width: 600px;
    margin: 0 auto 24px auto;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }

  .dni-lookup-wrapper label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
    color: #33475b;
    font-size: 14px;
  }

  .dni-lookup-row {
    display: flex;
    gap: 10px;
  }

  .dni-lookup-row input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #cbd6e2;
    border-radius: 4px;
    font-size: 14px;
  }

  .dni-lookup-row button {
    padding: 10px 20px;
    background-color: #ff7a59;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    font-weight: 600;
  }

  .dni-lookup-row button:hover { background-color: #e8674a; }
  .dni-lookup-row button:disabled { background-color: #aaa; cursor: not-allowed; }

  .dni-resultado {
    margin-top: 12px;
    padding: 12px;
    border-radius: 4px;
    font-size: 14px;
    display: none;
  }

  .dni-resultado.ok { background: #e8f5e9; border: 1px solid #81c784; color: #2e7d32; }
  .dni-resultado.error { background: #fdecea; border: 1px solid #e57373; color: #c62828; }
</style>

<div class="mobile-form-wrapper">

<div class="dni-lookup-wrapper">
  <label>Ingresá el DNI del inquilino para cargar sus datos automáticamente</label>
  <div class="dni-lookup-row">
    <input type="number" id="dni-input" placeholder="Ej: 30123456" />
    <button id="dni-btn" onclick="buscarInquilino()">Buscar</button>
  </div>
  <div class="dni-resultado" id="dni-resultado"></div>
</div>

<script>
// ⚠️ TOKEN SOLO PARA TEST — remover antes de producción
var HS_TOKEN = '${TOKEN}';

function buscarInquilino() {
  var dni = document.getElementById('dni-input').value.trim();
  var btn = document.getElementById('dni-btn');
  var res = document.getElementById('dni-resultado');

  if (!dni) {
    mostrarResultado('Ingresá un DNI válido.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Buscando...';
  res.style.display = 'none';

  fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + HS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'nro_documento_txt', operator: 'EQ', value: String(parseInt(dni)) }] }],
      properties: ['firstname', 'lastname', 'nro_documento_txt'],
      limit: 1
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    btn.disabled = false;
    btn.textContent = 'Buscar';

    if (!data.results || data.results.length === 0) {
      mostrarResultado('No se encontró ningún inquilino con ese DNI en el sistema.', 'error');
      return;
    }

    var contacto = data.results[0].properties;
    var nombre = (contacto.firstname || '') + ' ' + (contacto.lastname || '');
    nombre = nombre.trim();

    mostrarResultado('✓ Inquilino encontrado: ' + nombre, 'ok');
    prellenarFormulario(dni, nombre);
  })
  .catch(function() {
    btn.disabled = false;
    btn.textContent = 'Buscar';
    mostrarResultado('Error al consultar. Intentá nuevamente.', 'error');
  });
}

function mostrarResultado(msg, tipo) {
  var el = document.getElementById('dni-resultado');
  el.textContent = msg;
  el.className = 'dni-resultado ' + tipo;
  el.style.display = 'block';
}

function prellenarFormulario(dni, nombre) {
  var intentos = 0;
  var intervalo = setInterval(function() {
    intentos++;
    var dniField = document.querySelector('input[name="dni_inquilino"]');
    var nombreField = document.querySelector('input[name="nombre_y_apellido_del_inquilino"]');

    if (dniField && nombreField) {
      clearInterval(intervalo);
      dniField.value = dni;
      dniField.dispatchEvent(new Event('input', { bubbles: true }));
      dniField.dispatchEvent(new Event('change', { bubbles: true }));
      nombreField.value = nombre;
      nombreField.dispatchEvent(new Event('input', { bubbles: true }));
      nombreField.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (intentos > 20) clearInterval(intervalo);
  }, 300);
}
</script>`;

const footerHtml = `</div>`;

fetch('https://api.hubapi.com/cms/v3/pages/landing-pages/415403503839', {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ headHtml, footerHtml })
})
.then(r => r.json())
.then(d => {
  if (d.id) console.log('✅ Landing de test actualizada. URL:', d.url);
  else console.error('Error:', JSON.stringify(d, null, 2));
})
.catch(console.error);
