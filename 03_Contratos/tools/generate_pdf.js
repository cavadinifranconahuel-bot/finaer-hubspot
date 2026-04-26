const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const OUT  = path.join(BASE, 'Diagrama de Flujo — Gestión de Contratos.pdf');

// ── Colores ───────────────────────────────────────────
const C = {
  orange:     '#FF7A59',
  blue:       '#4299E1',
  blueBg:     '#EBF8FF',
  green:      '#48BB78',
  greenBg:    '#F0FFF4',
  yellow:     '#D69E2E',
  yellowBg:   '#FFFBEB',
  purple:     '#9F7AEA',
  purpleBg:   '#FAF5FF',
  dark:       '#1A202C',
  gray:       '#718096',
  lightGray:  '#E2E8F0',
  white:      '#FFFFFF',
  pageBg:     '#F4F6F9',
};

const doc = new PDFDocument({ size: 'A4', margin: 0, layout: 'portrait' });
doc.pipe(fs.createWriteStream(OUT));

const PW = doc.page.width;   // 595
const PH = doc.page.height;  // 842

// ── Fondo ─────────────────────────────────────────────
doc.rect(0, 0, PW, PH).fill(C.pageBg);

// ── Panel blanco central ──────────────────────────────
const PAD = 30;
doc.roundedRect(PAD, PAD, PW - PAD*2, PH - PAD*2, 10).fill(C.white);

// ── Header ────────────────────────────────────────────
doc.rect(PAD, PAD, PW - PAD*2, 70).fill(C.white);
doc.moveTo(PAD, PAD + 70).lineTo(PW - PAD, PAD + 70).lineWidth(3).strokeColor(C.orange).stroke();

doc.fillColor(C.orange).fontSize(8).font('Helvetica-Bold')
   .text('FINAER — HUBSPOT CRM', PAD + 20, PAD + 14, { characterSpacing: 1.5 });

doc.fillColor(C.dark).fontSize(18).font('Helvetica-Bold')
   .text('Gestión de Contratos', PAD + 20, PAD + 28);

doc.fillColor(C.gray).fontSize(9).font('Helvetica')
   .text('Diagrama de flujo del proceso automatizado  ·  Versión 1.0 — Abril 2026', PAD + 20, PAD + 52);

// ── Helper: caja de nodo ──────────────────────────────
function box(x, y, w, h, opts = {}) {
  const r = opts.radius !== undefined ? opts.radius : 6;
  const bg = opts.bg || C.blueBg;
  const border = opts.border || C.blue;
  const lw = opts.lw || 1.5;
  doc.roundedRect(x, y, w, h, r).fill(bg).roundedRect(x, y, w, h, r).lineWidth(lw).strokeColor(border).stroke();
}

function nodeText(x, y, w, lines, opts = {}) {
  const color = opts.color || C.dark;
  const size  = opts.size  || 8.5;
  const bold  = opts.bold;
  doc.fillColor(color).fontSize(size).font(bold ? 'Helvetica-Bold' : 'Helvetica');
  const totalH = lines.length * (size + 3);
  let startY = y - totalH / 2 + size / 2;
  for (const line of lines) {
    doc.text(line, x, startY, { width: w, align: 'center' });
    startY += size + 3;
  }
}

// ── Helper: flecha vertical ───────────────────────────
function arrowDown(x, fromY, toY, label = '') {
  doc.moveTo(x, fromY).lineTo(x, toY - 8).lineWidth(1.5).strokeColor(C.gray).stroke();
  // arrowhead
  doc.polygon([x, toY], [x - 5, toY - 9], [x + 5, toY - 9]).fill(C.gray);
  if (label) {
    doc.fillColor(C.gray).fontSize(7.5).font('Helvetica')
       .text(label, x - 30, fromY + (toY - fromY) / 2 - 5, { width: 60, align: 'center' });
  }
}

// ── Helper: flecha horizontal ─────────────────────────
function arrowRight(fromX, toX, y) {
  doc.moveTo(fromX, y).lineTo(toX - 8, y).lineWidth(1.5).strokeColor(C.gray).stroke();
  doc.polygon([toX, y], [toX - 9, y - 5], [toX - 9, y + 5]).fill(C.gray);
}

// ── Layout base ───────────────────────────────────────
const CX = PW / 2;   // centro horizontal
const TOP = PAD + 85;
let Y = TOP;

// ── Nodo 1: Deal Pipeline de Ventas ──────────────────
const N1W = 220, N1H = 52;
const N1X = CX - N1W / 2;
box(N1X, Y, N1W, N1H, { bg: '#EBF8FF', border: C.blue, lw: 2 });
nodeText(N1X, Y + N1H / 2, N1W,
  ['Deal — Pipeline de Ventas', 'Solicitud A-XXXXXX'],
  { bold: false, size: 8.5 }
);
const Y1B = Y + N1H;   // bottom of node 1
Y = Y1B;

// flecha + label "se completa fecha_firma_fianza"
arrowDown(CX, Y, Y + 34, 'fecha_firma_fianza\ncompleta');
Y += 34;

// ── Nodo 2: Rombo condición ────────────────────────────
const DW = 140, DH = 36;
const DX = CX - DW / 2;
doc.save();
doc.translate(CX, Y + DH / 2);
doc.path(`M 0 ${-DH/2} L ${DW/2} 0 L 0 ${DH/2} L ${-DW/2} 0 Z`).fill('#FFF5F5').path(`M 0 ${-DH/2} L ${DW/2} 0 L 0 ${DH/2} L ${-DW/2} 0 Z`).lineWidth(1.5).strokeColor('#FC8181').stroke();
doc.restore();
doc.fillColor(C.dark).fontSize(8).font('Helvetica-Bold')
   .text('¿Tiene fecha?', CX - 50, Y + DH / 2 - 6, { width: 100, align: 'center' });
const Y2B = Y + DH;
Y = Y2B;

// "Sí" flecha abajo
doc.fillColor(C.green).fontSize(8).font('Helvetica-Bold').text('Sí', CX + 3, Y + 3);
arrowDown(CX, Y, Y + 22);
Y += 22;

// ── Nodo 3: Workflow ──────────────────────────────────
const N3W = 240, N3H = 40;
box(CX - N3W/2, Y, N3W, N3H, { bg: '#FFFBEB', border: C.yellow, lw: 2 });
nodeText(CX - N3W/2, Y + N3H/2, N3W,
  ['⚡ WORKFLOW', 'Contratos — Crear Deal desde Firma'],
  { size: 8.5 }
);
const Y3B = Y + N3H;
Y = Y3B;
arrowDown(CX, Y, Y + 20);
Y += 20;

// ── Nodo 4: Crear Deal ────────────────────────────────
const N4W = 260, N4H = 62;
box(CX - N4W/2, Y, N4W, N4H, { bg: C.greenBg, border: C.green, lw: 2 });
doc.fillColor(C.dark).fontSize(8.5).font('Helvetica-Bold')
   .text('Crear Deal en Pipeline "Gestión de Contratos"', CX - N4W/2 + 8, Y + 8, { width: N4W - 16, align: 'center' });
doc.fillColor(C.gray).fontSize(7.5).font('Helvetica')
   .text('Etapa: Pendiente  ·  Nombre: Contrato — {Código}', CX - N4W/2 + 8, Y + 25, { width: N4W - 16, align: 'center' });
doc.fillColor(C.gray).fontSize(7.5)
   .text('Fecha firma copiada  ·  OC responsable copiado', CX - N4W/2 + 8, Y + 38, { width: N4W - 16, align: 'center' });
doc.fillColor(C.gray).fontSize(7.5)
   .text('Código solicitud copiado', CX - N4W/2 + 8, Y + 51, { width: N4W - 16, align: 'center' });
const Y4B = Y + N4H;
Y = Y4B;
arrowDown(CX, Y, Y + 20);
Y += 20;

// ── Nodo 5: Asignación rotativa ───────────────────────
const N5W = 200, N5H = 36;
box(CX - N5W/2, Y, N5W, N5H, { bg: C.purpleBg, border: C.purple, lw: 2 });
nodeText(CX - N5W/2, Y + N5H/2, N5W,
  ['🔄 Asignación rotativa', 'entre ejecutivos de contratos'],
  { size: 8 }
);
const Y5B = Y + N5H;
const Y5MID = Y + N5H / 2;
Y = Y5B;

// ── Ramificación a 4 ejecutivos ───────────────────────
const GAP = 20;
const EW = 78, EH = 38;
const totalW = 4 * EW + 3 * GAP;
const startX = CX - totalW / 2;
const execs = ['Ejecutivo 1', 'Ejecutivo 2', 'Ejecutivo 3', 'Ejecutivo 4'];
const EY = Y + 35;

// línea horizontal distribuidora
doc.moveTo(startX + EW/2, Y5B + 18)
   .lineTo(startX + 3*(EW + GAP) + EW/2, Y5B + 18)
   .lineWidth(1.5).strokeColor(C.gray).stroke();

for (let i = 0; i < 4; i++) {
  const ex = startX + i * (EW + GAP);
  const eCX = ex + EW / 2;
  // línea vertical desde horizontal distribuidora
  doc.moveTo(eCX, Y5B + 18).lineTo(eCX, EY).lineWidth(1.5).strokeColor(C.gray).stroke();
  doc.polygon([eCX, EY], [eCX - 4, EY - 8], [eCX + 4, EY - 8]).fill(C.gray);
  box(ex, EY, EW, EH, { bg: '#F7FAFC', border: C.lightGray, radius: 4, lw: 1 });
  doc.fillColor(C.dark).fontSize(8).font('Helvetica')
     .text('👤 ' + execs[i], ex + 2, EY + EH/2 - 5, { width: EW - 4, align: 'center' });
}

// línea desde nodo 5 hasta distribuidor
doc.moveTo(CX, Y5B).lineTo(CX, Y5B + 18).lineWidth(1.5).strokeColor(C.gray).stroke();

// líneas convergentes de los 4 ejecutivos a notificación
Y = EY + EH;
const NOTY = Y + 30;

for (let i = 0; i < 4; i++) {
  const eCX = startX + i*(EW+GAP) + EW/2;
  doc.moveTo(eCX, Y).lineTo(eCX, Y + 15).lineWidth(1.5).strokeColor(C.gray).stroke();
  doc.moveTo(eCX, Y + 15).lineTo(CX, Y + 15).lineWidth(1.5).strokeColor(C.gray).stroke();
}
doc.moveTo(CX, Y + 15).lineTo(CX, NOTY).lineWidth(1.5).strokeColor(C.gray).stroke();
doc.polygon([CX, NOTY], [CX - 4, NOTY - 8], [CX + 4, NOTY - 8]).fill(C.gray);
Y = NOTY;

// ── Nodo 6: Notificación ──────────────────────────────
const N6W = 220, N6H = 36;
box(CX - N6W/2, Y, N6W, N6H, { bg: '#FFF5F5', border: '#FC8181', lw: 2 });
nodeText(CX - N6W/2, Y + N6H/2, N6W,
  ['🔔 Notificación automática', 'al ejecutivo asignado'],
  { size: 8.5 }
);
const Y6B = Y + N6H;
Y = Y6B;
arrowDown(CX, Y, Y + 20);
Y += 20;

// ── Nodo 7: Gestiona ─────────────────────────────────
const N7W = 190, N7H = 32;
box(CX - N7W/2, Y, N7W, N7H, { bg: '#F7FAFC', border: C.lightGray, lw: 2 });
nodeText(CX - N7W/2, Y + N7H/2, N7W,
  ['📌 Ejecutivo gestiona el contrato'],
  { size: 8.5 }
);
const Y7B = Y + N7H;
Y = Y7B;

// ── 3 etapas finales ──────────────────────────────────
const SW = 110, SH = 38, SGAP = 14;
const totalSW = 3*SW + 2*SGAP;
const SX0 = CX - totalSW/2;
const SY = Y + 30;

// distribuidor horizontal
doc.moveTo(SX0 + SW/2, Y7B + 12).lineTo(SX0 + 2*(SW+SGAP) + SW/2, Y7B + 12).lineWidth(1.5).strokeColor(C.gray).stroke();
doc.moveTo(CX, Y7B).lineTo(CX, Y7B + 12).lineWidth(1.5).strokeColor(C.gray).stroke();

const stages = [
  { label: 'PENDIENTE', icon: '⏳', desc: 'Sin intervención', bg: C.blueBg, border: C.blue },
  { label: 'EN GESTIÓN', icon: '🔧', desc: 'Trabajando',       bg: C.yellowBg, border: C.yellow },
  { label: 'EMITIDO',   icon: '✅', desc: 'Contrato listo',   bg: C.greenBg,  border: C.green },
];

for (let i = 0; i < 3; i++) {
  const sx = SX0 + i*(SW+SGAP);
  const sCX = sx + SW/2;
  doc.moveTo(sCX, Y7B + 12).lineTo(sCX, SY).lineWidth(1.5).strokeColor(C.gray).stroke();
  doc.polygon([sCX, SY], [sCX - 4, SY - 8], [sCX + 4, SY - 8]).fill(C.gray);
  const s = stages[i];
  box(sx, SY, SW, SH, { bg: s.bg, border: s.border, lw: 1.5, radius: 6 });
  doc.fillColor(C.dark).fontSize(8).font('Helvetica-Bold')
     .text(s.icon + ' ' + s.label, sx + 2, SY + 7, { width: SW - 4, align: 'center' });
  doc.fillColor(C.gray).fontSize(7).font('Helvetica')
     .text(s.desc, sx + 2, SY + 21, { width: SW - 4, align: 'center' });
}

// ── Leyenda ───────────────────────────────────────────
const LY = SY + SH + 24;
const LW = (PW - PAD*2 - 40) / 3;
const legends = [
  { color: C.blue,   label: 'Disparador',    desc: 'La fecha de firma activa el flujo automáticamente.' },
  { color: C.green,  label: 'Automatización', desc: 'Workflow crea el Deal, asigna y notifica.' },
  { color: '#ED8936', label: 'Gestión manual', desc: 'El ejecutivo avanza el pipeline manualmente.' },
];

for (let i = 0; i < 3; i++) {
  const lx = PAD + 20 + i*(LW + 8);
  doc.rect(lx, LY, LW, 46).fill('#FAFBFC').rect(lx, LY, LW, 46).lineWidth(1).strokeColor(C.lightGray).stroke();
  doc.rect(lx, LY, 4, 46).fill(legends[i].color);
  doc.fillColor(C.dark).fontSize(7.5).font('Helvetica-Bold')
     .text(legends[i].label.toUpperCase(), lx + 10, LY + 8, { width: LW - 14 });
  doc.fillColor(C.gray).fontSize(7).font('Helvetica')
     .text(legends[i].desc, lx + 10, LY + 21, { width: LW - 14 });
}

// ── Footer ────────────────────────────────────────────
const FY = PH - PAD - 22;
doc.moveTo(PAD + 20, FY).lineTo(PW - PAD - 20, FY).lineWidth(0.5).strokeColor(C.lightGray).stroke();
doc.fillColor(C.gray).fontSize(7.5).font('Helvetica')
   .text('FINAER  ·  Proyecto HubSpot — Gestión de Contratos  ·  2026', PAD + 20, FY + 6, { width: PW - PAD*2 - 40, align: 'right' });

doc.end();
console.log('✅ PDF generado:', OUT);
