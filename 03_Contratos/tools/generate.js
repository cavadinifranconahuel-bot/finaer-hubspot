const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
        WidthType, BorderStyle, AlignmentType, ShadingType, PageBreak,
        TableOfContents, StyleLevel, UnderlineType, VerticalAlign } = require('docx');
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');

// ══════════════════════════════════════════════════════
//  1. PDF — Diagrama de flujo
// ══════════════════════════════════════════════════════
async function generatePDF() {
  console.log('Generando PDF del diagrama de flujo...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Users/Usuario/.cache/puppeteer/chrome/win64-147.0.7727.57/chrome-win64/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  const htmlPath = path.join(BASE, 'diagrama_flujo.html');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for Mermaid to render
  await page.waitForTimeout(3000);

  await page.pdf({
    path: path.join(BASE, 'Diagrama de Flujo — Gestión de Contratos.pdf'),
    format: 'A4',
    landscape: false,
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
  });

  await browser.close();
  console.log('  ✅ PDF generado');
}

// ══════════════════════════════════════════════════════
//  2. DOCX — Propuesta ejecutiva/funcional
// ══════════════════════════════════════════════════════
function cell(text, opts = {}) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.header ? { type: ShadingType.SOLID, color: '2D3748' } : opts.even ? { type: ShadingType.SOLID, color: 'F7FAFC' } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({
        text,
        color: opts.header ? 'FFFFFF' : opts.muted ? '718096' : '1A202C',
        bold: opts.header || opts.bold,
        size: opts.header ? 20 : 19,
        font: 'Calibri'
      })]
    })]
  });
}

function badge(text, color) {
  return new TextRun({ text: ` [${text}] `, color, bold: true, size: 18, font: 'Calibri' });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    border: { bottom: { color: 'FF7A59', size: 12, style: BorderStyle.SINGLE } },
    children: [new TextRun({ text, bold: true, size: 30, color: '1A202C', font: 'Calibri' })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: '2D3748', font: 'Calibri' })]
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 22, color: opts.muted ? '718096' : '333333', font: 'Calibri', bold: opts.bold })]
  });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, color: '333333', font: 'Calibri' })]
  });
}

function callout(text) {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { left: { color: '4299E1', size: 20, style: BorderStyle.SINGLE } },
    shading: { type: ShadingType.SOLID, color: 'EBF8FF' },
    indent: { left: 200 },
    children: [new TextRun({ text, size: 21, color: '2C5282', font: 'Calibri', italics: true })]
  });
}

function calloutWarning(text) {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { left: { color: 'D69E2E', size: 20, style: BorderStyle.SINGLE } },
    shading: { type: ShadingType.SOLID, color: 'FFFBEB' },
    indent: { left: 200 },
    children: [new TextRun({ text, size: 21, color: '744210', font: 'Calibri', italics: true })]
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 60, after: 60 }, children: [] });
}

async function generateDOCX() {
  console.log('Generando DOCX de propuesta ejecutiva...');

  const tableFields = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('Campo', { header: true }), cell('Tipo', { header: true }), cell('Origen', { header: true })] }),
      new TableRow({ children: [cell('Nombre del contrato'), cell('Texto'), cell('Automático — generado por workflow')] }),
      new TableRow({ children: [cell('Ejecutivo asignado', { even: true }), cell('Usuario HubSpot', { even: true }), cell('Automático — asignación rotativa', { even: true })] }),
      new TableRow({ children: [cell('Fecha firma fianza'), cell('Fecha'), cell('Automático — copiada del Deal de ventas')] }),
      new TableRow({ children: [cell('Código de solicitud', { even: true }), cell('Texto', { even: true }), cell('Automático — copiado del Deal de ventas', { even: true })] }),
      new TableRow({ children: [cell('OC responsable'), cell('Texto'), cell('Automático — copiado del Deal de ventas')] }),
      new TableRow({ children: [cell('Categoría del contrato', { even: true }), cell('Selección', { even: true }), cell('Manual — el ejecutivo selecciona', { even: true })] }),
      new TableRow({ children: [cell('Observaciones'), cell('Texto libre'), cell('Manual — el ejecutivo completa')] }),
    ]
  });

  const tableSituacion = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('Campo', { header: true }), cell('Descripción', { header: true }), cell('Hoy', { header: true }), cell('Con HubSpot', { header: true })] }),
      new TableRow({ children: [cell('Fecha'), cell('Fecha de ingreso'), cell('Manual'), cell('Automático')] }),
      new TableRow({ children: [cell('OC', { even: true }), cell('Ejecutivo comercial', { even: true }), cell('Manual', { even: true }), cell('Automático', { even: true })] }),
      new TableRow({ children: [cell('Controlador'), cell('Ejecutivo de contratos'), cell('Manual'), cell('Automático (rotación)')] }),
      new TableRow({ children: [cell('Código solicitud', { even: true }), cell('Código A-XXXXXX', { even: true }), cell('Manual', { even: true }), cell('Automático', { even: true })] }),
      new TableRow({ children: [cell('Fecha firma'), cell('Fecha/hora de firma'), cell('Manual'), cell('Automático')] }),
      new TableRow({ children: [cell('Categoría', { even: true }), cell('Tipo de contrato', { even: true }), cell('Manual', { even: true }), cell('Manual', { even: true })] }),
      new TableRow({ children: [cell('Observaciones'), cell('Notas del ejecutivo'), cell('Manual'), cell('Manual')] }),
    ]
  });

  const tablePlan = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('#', { header: true }), cell('Tarea', { header: true }), cell('Responsable', { header: true }), cell('Estado', { header: true })] }),
      new TableRow({ children: [cell('1'), cell('Confirmar valores del campo "Categoría" con el equipo'), cell('Franco Cavadini'), cell('Pendiente')] }),
      new TableRow({ children: [cell('2', { even: true }), cell('Confirmar usuarios HubSpot del equipo de contratos', { even: true }), cell('Franco Cavadini', { even: true }), cell('Pendiente', { even: true })] }),
      new TableRow({ children: [cell('3'), cell('Crear pipeline "Gestión de Contratos" con etapas'), cell('HubSpot Admin'), cell('A iniciar')] }),
      new TableRow({ children: [cell('4', { even: true }), cell('Crear propiedades: categoría y observaciones en Deals', { even: true }), cell('HubSpot Admin', { even: true }), cell('A iniciar', { even: true })] }),
      new TableRow({ children: [cell('5'), cell('Crear workflow de automatización completo'), cell('HubSpot Admin'), cell('A iniciar')] }),
      new TableRow({ children: [cell('6', { even: true }), cell('Prueba piloto con 3–5 contratos reales', { even: true }), cell('Equipo de contratos', { even: true }), cell('A iniciar', { even: true })] }),
      new TableRow({ children: [cell('7'), cell('Ajustes post-piloto y activación definitiva'), cell('Franco Cavadini'), cell('A iniciar')] }),
    ]
  });

  const doc = new Document({
    creator: 'FINAER — HubSpot Admin',
    title: 'Propuesta — Gestión de Contratos en HubSpot',
    description: 'Propuesta de implementación del sistema de gestión de contratos en HubSpot CRM',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '333333' }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
        }
      },
      children: [

        // ── PORTADA ──────────────────────────────────────
        spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: 'FINAER  ·  HubSpot CRM', size: 22, color: 'FF7A59', bold: true, font: 'Calibri', caps: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
          border: { bottom: { color: 'FF7A59', size: 16, style: BorderStyle.SINGLE } },
          children: [
            new TextRun({ text: 'Gestión de Contratos en HubSpot', size: 60, bold: true, color: '1A202C', font: 'Calibri', break: 1 }),
          ]
        }),
        spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 40 },
          children: [new TextRun({ text: 'Automatización del proceso de emisión y control de contratos', size: 26, color: '718096', font: 'Calibri' })]
        }),
        spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 40 },
          children: [new TextRun({ text: 'Organización: ', bold: true, size: 22, font: 'Calibri', color: '1A202C' }), new TextRun({ text: 'FINAER', size: 22, font: 'Calibri', color: '4A5568' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 40 },
          children: [new TextRun({ text: 'Área: ', bold: true, size: 22, font: 'Calibri', color: '1A202C' }), new TextRun({ text: 'Equipo de Gestión de Contratos', size: 22, font: 'Calibri', color: '4A5568' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 40 },
          children: [new TextRun({ text: 'Plataforma: ', bold: true, size: 22, font: 'Calibri', color: '1A202C' }), new TextRun({ text: 'HubSpot CRM — Portal EU1 145725856', size: 22, font: 'Calibri', color: '4A5568' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 40 },
          children: [new TextRun({ text: 'Versión: ', bold: true, size: 22, font: 'Calibri', color: '1A202C' }), new TextRun({ text: '1.0 — Abril 2026', size: 22, font: 'Calibri', color: '4A5568' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 40 },
          children: [new TextRun({ text: 'Estado: ', bold: true, size: 22, font: 'Calibri', color: '1A202C' }), new TextRun({ text: 'Propuesta para aprobación', size: 22, font: 'Calibri', color: '4A5568' })]
        }),
        spacer(),

        // PAGE BREAK
        new Paragraph({ children: [new PageBreak()] }),

        // ── 1. RESUMEN EJECUTIVO ─────────────────────────
        heading1('1. Resumen ejecutivo'),
        body('El equipo de gestión de contratos de FINAER administra actualmente el control y emisión de contratos de forma manual mediante una hoja de cálculo. Este documento propone migrar ese proceso a HubSpot CRM, aprovechando la integración ya existente con el sistema administrativo y los registros de solicitudes que ya operan en la plataforma.'),
        spacer(),
        callout('Objetivo principal: Reemplazar la planilla manual por un pipeline nativo de HubSpot que asigne contratos automáticamente, notifique al ejecutivo responsable y genere métricas de gestión en tiempo real — sin agregar carga operativa al equipo.'),
        spacer(),
        body('La propuesta prioriza la adopción sobre la complejidad: el proceso replicado en HubSpot es intencionalmente similar al que el equipo ya conoce, con los mismos campos y las mismas responsabilidades, pero con las ventajas de la automatización y la trazabilidad.'),

        // ── 2. SITUACIÓN ACTUAL ──────────────────────────
        heading1('2. Situación actual'),
        heading2('Proceso vigente'),
        body('Cuando una solicitud alcanza la etapa de firma, el equipo de contratos recibe la información por canales informales y registra manualmente en una hoja de cálculo compartida los datos del contrato. La siguiente tabla compara el estado actual con la solución propuesta:'),
        spacer(),
        tableSituacion,
        spacer(),

        heading2('Problemas del proceso actual'),
        bullet('Sin asignación automática: la distribución de trabajo depende de coordinación manual.'),
        bullet('Sin notificaciones: el ejecutivo debe estar atento a la planilla para detectar nuevos contratos.'),
        bullet('Sin métricas: no es posible medir volumen, tiempos o carga por persona de forma sistemática.'),
        bullet('Riesgo de pérdida de información: una fila mal completada o no registrada genera brechas.'),
        bullet('Duplicación de datos: la información ya existe en el sistema admin y en HubSpot, pero se re-ingresa manualmente.'),

        // ── 3. SOLUCIÓN PROPUESTA ────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading1('3. Solución propuesta'),
        heading2('Pipeline "Gestión de Contratos" en HubSpot'),
        body('Se crea un nuevo pipeline de negocios (Deals) en HubSpot específico para el equipo de contratos. Cada contrato a gestionar es un registro independiente, creado automáticamente cuando la fecha de firma es cargada en la solicitud original.'),
        spacer(),
        body('Etapas del pipeline:', { bold: true }),
        bullet('Pendiente — Recién asignado, el ejecutivo aún no intervino.'),
        bullet('En gestión — El ejecutivo está trabajando en el contrato.'),
        bullet('Emitido — El contrato está listo y controlado.'),
        bullet('Baja — Cancelado o no procede.'),
        spacer(),

        heading2('Campos del registro de contrato'),
        body('Los campos marcados como "Automático" se completan solos desde los datos del Deal de ventas. El ejecutivo solo completa los dos últimos.'),
        spacer(),
        tableFields,
        spacer(),
        callout('Principio de adopción: El equipo completa únicamente los campos que hoy ya completa en la planilla. El resto se llena automáticamente desde los datos que ya existen en HubSpot.'),

        // ── 4. AUTOMATIZACIÓN ────────────────────────────
        heading1('4. Automatización'),
        body('El flujo completo se implementa con un único workflow en HubSpot con los siguientes pasos:'),
        spacer(),
        body('Paso 1 — Disparador: fecha de firma cargada', { bold: true }),
        body('Cuando se completa la propiedad Fecha firma fianza en un Deal del Pipeline de Ventas, el workflow se activa automáticamente.'),
        spacer(),
        body('Paso 2 — Creación del Deal de contratos', { bold: true }),
        body('Se crea un nuevo Deal en el pipeline "Gestión de Contratos", en etapa "Pendiente", con los datos del Deal de ventas ya cargados.'),
        spacer(),
        body('Paso 3 — Asignación rotativa al equipo', { bold: true }),
        body('HubSpot distribuye el nuevo contrato automáticamente entre los ejecutivos del equipo de contratos, en rotación equitativa.'),
        spacer(),
        body('Paso 4 — Notificación al ejecutivo asignado', { bold: true }),
        body('El ejecutivo recibe una notificación inmediata en HubSpot y por email con el link directo al registro del contrato.'),
        spacer(),
        body('Paso 5 — Gestión y cierre', { bold: true }),
        body('El ejecutivo avanza el Deal entre las etapas del pipeline a medida que gestiona el contrato. Al finalizar, lo mueve a "Emitido".'),

        // ── 5. MÉTRICAS ──────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading1('5. Métricas y KPIs disponibles'),
        body('Con este modelo, los reportes nativos de HubSpot permiten medir automáticamente:'),
        spacer(),
        bullet('Volumen por período: contratos creados por semana, mes o ejecutivo comercial (OC).'),
        bullet('Carga por ejecutivo: contratos asignados y pendientes por cada miembro del equipo de contratos.'),
        bullet('Tiempo de gestión: tiempo promedio desde la asignación hasta la emisión del contrato.'),
        bullet('Stock pendiente: contratos en estado Pendiente o En gestión en tiempo real.'),

        // ── 6. PLAN DE IMPLEMENTACIÓN ────────────────────
        heading1('6. Plan de implementación'),
        tablePlan,
        spacer(),

        // ── 7. CRITERIOS DE ÉXITO ────────────────────────
        heading1('7. Criterios de éxito'),
        bullet('El equipo abandona la planilla de cálculo como herramienta principal de seguimiento.'),
        bullet('Cada contrato que llega a firma genera automáticamente un registro en HubSpot, sin intervención manual.'),
        bullet('Los ejecutivos completan solo 2 campos por contrato: categoría y observaciones.'),
        bullet('El tiempo de notificación desde la carga de la fecha de firma hasta que el ejecutivo recibe el aviso es inferior a 2 minutos.'),
        bullet('Se puede obtener el stock de contratos pendientes en tiempo real sin consultar a nadie.'),
        spacer(),
        calloutWarning('Nota sobre adopción: El éxito de este proyecto depende directamente de que el proceso en HubSpot sea igual o más simple que la planilla. Si en alguna etapa del piloto se detecta fricción operativa, se ajusta el diseño antes de la activación masiva.'),

        spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { color: 'E2E8F0', size: 6, style: BorderStyle.SINGLE } },
          spacing: { before: 200 },
          children: [new TextRun({ text: 'FINAER  ·  Propuesta de implementación — Gestión de Contratos en HubSpot  ·  Versión 1.0  ·  Abril 2026', size: 18, color: 'A0AEC0', font: 'Calibri' })]
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(BASE, 'Propuesta — Gestión de Contratos.docx'), buffer);
  console.log('  ✅ DOCX generado');
}

// ── RUN ────────────────────────────────────────────────
(async () => {
  try {
    await generateDOCX();
    await generatePDF();
    console.log('\n✅ Archivos generados en:', BASE);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
