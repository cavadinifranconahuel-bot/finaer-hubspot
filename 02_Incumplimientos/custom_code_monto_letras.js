// Custom Code — HubSpot Workflow
// Objeto: Ticket (Mora 1 — Incumplimientos)
// Trigger sugerido: etapa del ticket cambia a "Pago en proceso"
// Qué hace: lee monto_total_de_la_deuda_acumulada y escribe monto_total_deuda_letras

const hubspot = require('@hubspot/api-client');

// ── Conversión número a letras ───────────────────────────────────────────────

const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const DECENAS  = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function decenas(n) {
  if (n < 20) return UNIDADES[n];
  const d = Math.floor(n / 10), u = n % 10;
  if (u === 0) return DECENAS[d];
  if (d === 2) return u === 1 ? 'veintiún' : 'veinti' + UNIDADES[u];
  return DECENAS[d] + ' y ' + UNIDADES[u];
}

function centenas(n) {
  if (n === 0)   return '';
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100), r = n % 100;
  return (c > 0 ? CENTENAS[c] : '') + (r > 0 ? (c > 0 ? ' ' : '') + decenas(r) : '');
}

function numeroALetras(n) {
  if (typeof n === 'string') n = parseFloat(String(n).replace(/[^0-9.]/g, ''));
  if (isNaN(n) || n < 0) return '';
  if (n === 0) return 'Cero pesos';

  const entero   = Math.floor(n);
  const centavos = Math.round((n - entero) * 100);
  const millones = Math.floor(entero / 1_000_000);
  const miles    = Math.floor((entero % 1_000_000) / 1_000);
  const resto    = entero % 1_000;

  const partes = [];
  if (millones > 0) partes.push((millones === 1 ? 'un' : centenas(millones)) + (millones === 1 ? ' millón' : ' millones'));
  if (miles    > 0) partes.push(miles === 1 ? 'mil' : centenas(miles) + ' mil');
  if (resto    > 0) partes.push(centenas(resto));

  const texto = partes.join(' ');
  const solMillones = millones > 0 && miles === 0 && resto === 0;
  const moneda = solMillones ? ' de pesos' : entero === 1 ? ' peso' : ' pesos';
  const resultado = texto + moneda + (centavos > 0 ? ` con ${centavos}/100` : '');

  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────

exports.main = async (event, callback) => {
  const client    = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
  const ticketId  = event.object.objectId;

  try {
    const ticket = await client.crm.tickets.basicApi.getById(
      ticketId,
      ['monto_total_de_la_deuda_acumulada']
    );

    const monto  = ticket.properties.monto_total_de_la_deuda_acumulada;
    const letras = monto ? numeroALetras(monto) : '';

    await client.crm.tickets.basicApi.update(ticketId, {
      properties: { monto_total_deuda_letras: letras }
    });

    console.log(`Ticket ${ticketId} | monto: ${monto} | letras: ${letras}`);

    callback({ outputFields: { monto_letras: letras } });

  } catch (e) {
    console.error('Error:', e.message);
    callback({ outputFields: { monto_letras: '' } });
  }
};
