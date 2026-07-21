// AWS Lambda — Generador de PDF: Recibo RUBROS_NORMALES
// Recibe datos del ticket de HubSpot, genera el PDF y lo devuelve en base64
// Runtime: Node.js 18.x
// Layer requerida: https://github.com/Sparticuz/chromium (arn:aws:lambda:us-east-1:...:layer:chromium:...)

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// ── Conversión número a letras ───────────────────────────────────────────────

const UNIDADES = ['','un','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
  'diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve'];
const DECENAS  = ['','diez','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const CENTENAS = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos',
  'seiscientos','setecientos','ochocientos','novecientos'];

function decenas(n) {
  if (n < 20) return UNIDADES[n];
  const d = Math.floor(n/10), u = n%10;
  if (u === 0) return DECENAS[d];
  if (d === 2) return u === 1 ? 'veintiún' : 'veinti'+UNIDADES[u];
  return DECENAS[d]+' y '+UNIDADES[u];
}
function centenas(n) {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const c = Math.floor(n/100), r = n%100;
  return (c>0 ? CENTENAS[c] : '')+(r>0 ? (c>0?' ':'')+decenas(r) : '');
}
function numeroALetras(n) {
  if (typeof n === 'string') n = parseFloat(String(n).replace(/[^0-9.]/g,''));
  if (isNaN(n)||n<0) return '';
  if (n===0) return 'Cero pesos';
  const entero=Math.floor(n), centavos=Math.round((n-entero)*100);
  const millones=Math.floor(entero/1_000_000), miles=Math.floor((entero%1_000_000)/1_000), resto=entero%1_000;
  const partes=[];
  if (millones>0) partes.push((millones===1?'un':centenas(millones))+(millones===1?' millón':' millones'));
  if (miles>0)    partes.push(miles===1?'mil':centenas(miles)+' mil');
  if (resto>0)    partes.push(centenas(resto));
  const texto=partes.join(' ');
  const solMillones=millones>0&&miles===0&&resto===0;
  const moneda=solMillones?' de pesos':entero===1?' peso':' pesos';
  const resultado=texto+moneda+(centavos>0?` con ${centavos}/100`:'');
  return resultado.charAt(0).toUpperCase()+resultado.slice(1);
}

// ── Formato número con puntos ────────────────────────────────────────────────
function fmtMonto(v) {
  const n = parseFloat(String(v||'0').replace(/[^0-9.]/g,''))||0;
  return n.toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:2});
}

// ── Renderizar template HTML con los datos ───────────────────────────────────
function renderTemplate(data) {
  const hoy = new Date();
  const fechaActual = `${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;

  const montoNum = parseFloat(String(data.monto_total||'0').replace(/[^0-9.]/g,''))||0;

  // Armar filas de rubros
  const RUBROS_MAP = [
    { key: 'deuda_alquiler',   label: 'Alquiler' },
    { key: 'deuda_expensas',   label: 'Expensas' },
    { key: 'deuda_luz',        label: 'Luz' },
    { key: 'deuda_gas',        label: 'Gas' },
    { key: 'deuda_abl',        label: 'ABL' },
    { key: 'deuda_aysa',       label: 'AYSA / Agua' },
    { key: 'punitorio_alquiler', label: 'Punitorio alquiler' },
    { key: 'deuda_por_entrega_de_llaves', label: 'Entrega de llaves' },
  ];
  const rubrosHtml = RUBROS_MAP
    .filter(r => data[r.key] && parseFloat(data[r.key]) > 0)
    .map(r => `<div class="rubro-fila"><span>${r.label}</span><span>$${fmtMonto(data[r.key])}</span></div>`)
    .join('');

  let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

  // Reemplazar tokens simples
  const tokens = {
    '{{fecha_actual}}':         fechaActual,
    '{{monto_numerico}}':       fmtMonto(montoNum),
    '{{monto_letras}}':         data.monto_letras || numeroALetras(montoNum),
    '{{caracter_locador}}':     data.caracter_locador || 'Locador/a',
    '{{fecha_inicio_contrato}}':data.fecha_inicio_contrato || '—',
    '{{direccion_inmueble}}':   data.direccion_inmueble || '—',
    '{{nombre_inquilino}}':     data.nombre_inquilino || '—',
    '{{dni_inquilino}}':        data.dni_inquilino || '—',
  };
  for (const [token, val] of Object.entries(tokens)) {
    html = html.replaceAll(token, val);
  }

  // Reemplazar bloque de rubros (Mustache-like manual)
  html = html.replace(/\{\{#rubros\}\}[\s\S]*?\{\{\/rubros\}\}/, rubrosHtml);

  return html;
}

// ── Handler Lambda ────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  let data;
  try {
    data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body JSON inválido' }) };
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    const html = renderTemplate(data);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: false,
    });

    const base64 = pdfBuffer.toString('base64');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_base64: base64 }),
    };

  } catch (e) {
    console.error('Error generando PDF:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  } finally {
    if (browser) await browser.close();
  }
};
