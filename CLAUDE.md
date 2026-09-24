# FINAER — HubSpot Operations
# Franco Cavadini | Arquitecto de Operaciones CRM
# Versión 3.1 | Agosto 2026

================================================================================
ROL DE CLAUDE EN ESTE PROYECTO
================================================================================

Socio técnico y estratégico en la operación y evolución del sistema HubSpot
de FINAER. Pensás conmigo, cuestionás lo que no tiene sentido operativo, y
ayudás a construir soluciones que el equipo pueda usar sin fricción.

Idioma: siempre español. Sin excepciones.

Para el proyecto de la consultora personal de Franco, ver:
Desktop/Franco Cavadini/CLAUDE.md
Nectia: Emanuel Baez (@emanuelbaez1996) se sumó como co-fundador en agosto 2026.
Perfil: arquitecto de bases de datos (Fabric, Clicksense). Repo compartido: cavadinifranconahuel-bot/consultora.

================================================================================
CONTEXTO DE FINAER
================================================================================

Empresa de garantías de alquiler. Buenos Aires, Argentina.
Respalda a inquilinos sin inmueble propio para presentar como garantía.
Actores principales: inmobiliarias, propietarios, inquilinos/solicitantes.

Portal HubSpot: EU1 | ID 145725856 | app-eu1.hubspot.com
Moneda: ARS | Zona horaria: America/Buenos_Aires
Contrato: 2 años (ene 2025 – ene 2027) | Facturación mensual

================================================================================
SUSCRIPCIÓN HUBSPOT
================================================================================

| Hub              | Tier         | Licencias | Notas clave                        |
|------------------|--------------|-----------|------------------------------------|
| Marketing Hub    | Professional | 3 + 12K   | Forms, email marketing, landing    |
| Sales Hub        | Professional | 7         | Sequences, pipelines, forecasting  |
| Service Hub      | Professional | 7         | Help desk, chatbot, Breeze AI      |
| Content Hub      | Professional | 3         | Website, landing pages, blog       |
| Data Hub         | Professional | 1         | Custom code, serverless, webhooks  |
| Transactional    | Add-on       | 1         | Emails operativos sin cuota        |

NOTA CRÍTICA — Data Hub Professional:
Data Hub = Operations Hub (rebrand 2024). Serverless functions y custom code
en workflows SÍ están disponibles. Re-testear en Visitas Comerciales.

Módulos sin uso claro para el modelo de negocio actual:
- Content Hub Professional (~EUR 290/mes): sin uso documentado
- Transactional Email Add-on (~EUR 425/mes): EN USO desde julio 2026 vía SMTP
  custom code. Dos usos activos: carta de pago (Incumplimientos) y envío masivo
  judiciales (09_Judiciales/send_emails.js). smtp.hubapi.com:587.
No se pueden dar de baja hasta enero 2027.

Acceso MCP (Claude Code → HubSpot):
- Lectura + escritura: Contact, Company, Deal, Ticket, Note, Call,
  Meeting, Task, Email, Product, Line Item
- Solo lectura vía MCP: Orders, Quotes, Subscriptions, Invoices

================================================================================
PRINCIPIOS DE TRABAJO — HUBSPOT
================================================================================

1. Nativo primero — funcionalidades nativas antes de construir custom
2. Reutilizar antes de crear — validar si ya existe propiedad, workflow
   o formulario antes de crear uno nuevo
3. Validar antes de proponer — revisar el estado real del portal vía API
   o UI antes de recomendar cualquier cambio
4. Explicar antes de ejecutar — nunca hacer cambios sin aprobación explícita
5. Si algo es irreversible o afecta producción: confirmación doble

================================================================================
PROYECTOS FINAER
================================================================================

── 01_VISITAS COMERCIALES ✅ Operativo ──────────────────────────────────────
Ruta: Desktop/HubSpot/01_Visitas-Comerciales/
Objetivo: oficiales de cuentas registran visitas a inmobiliarias desde móvil

Arquitectura:
- 5 formularios HubSpot nativos (uno por estado: NUEVA/ACTIVA/PASIVA/
  INACTIVA/PERDIDA) — IDs documentados en memory/project_form_ids.md
- WF-A: asigna URL del formulario correcto según estado de la empresa
- WF-B: al enviar, crea Deal en pipeline Visitas + copia 47 propiedades
- WF-C: asocia Deal con la empresa | WF-D: asigna propietario (backup)
- Re-enrollment activo para múltiples visitas al mismo cliente
- Pipeline ID: 3588863210 | Stage ID: 4921967837

Restricciones activas:
- hubspot.fetch → 488 en EU1 (bug de plataforma, pendiente de re-testear
  con Data Hub Pro disponible)
- Sin Operations Hub al momento de construcción (ahora es Data Hub Pro)

Restricciones de implementación:
- Formularios v2 BLOQUEADOS: hay 4 inputs de negocio que debe confirmar gerencia
  comercial antes de tocar los 5 formularios (NUEVA/ACTIVA/PASIVA/INACTIVA/PERDIDA):
  lista de competidores, lista de productos de merch, motivos de pasividad
  definitivos, reemplazo de "Problemas de servicio" en PERDIDAS.
  No implementar cambios de v2 sin estas 4 listas confirmadas.
- Serverless function buscar-inquilino: existe en repo en
  01_Visitas-Comerciales/serverless/buscar-inquilino/ — estado de despliegue
  SIN CONFIRMAR. Validar antes de asumir que el bloqueo de serverless sigue vigente.

Backlog:
- Dashboard de actividad comercial (visitas por ejecutivo, estado, zona)
- Alertas por falta de visita según estado de la empresa
- Resultado de visita → cambio de estado automático en la empresa
- RE-TESTEAR serverless functions (Data Hub Pro ahora disponible)

── 02_INCUMPLIMIENTOS ✅ Operativo ──────────────────────────────────────────
Ruta: Desktop/HubSpot/02_Incumplimientos/
Capacitaciones: Mora 1 (27/04/2026) | Mora 2 completa (21/07/2026)

Lógica de negocio — 3 niveles:
- Ticket = fuente de verdad. Registra el impago. Pipeline: 3353793749
- Deal PERÍODO (pipeline 3403406575) = 1 por mes por expediente. SAI los
  crea vía API directa; el WF los nutre al cerrar ticket.
- Deal MAESTRO (pipeline 3920555199) = 1 por expediente. Acumula totales.

Workflows operativos clave:
- WF4 (ID: 3654117624): Ticket "Pago en proceso" → crea Deal (Mora 1)
- WF2 (ID: 3962960072): copia 16 propiedades Ticket → Deal
- WF 4504390847: formulario → crea/nutre ticket por período
- WF 4465972431: ticket Cerrado (pago FINAER) → CASO SÍ / CASO NO en deal período
- WF 4465889492: deal período con nro_expediente IS_KNOWN → actualiza maestro
- WF 4128732405: monto_recupero > 0 → crea Pedido Recupero (DESACTIVADO)
- WF 4128739569: monto_desembolso > 0 → crea Pedido Desembolso (DESACTIVADO)
  NOTA: activar Pedidos recién después de limpiar monto_recupero en 367 deals

WFs de asociación Contacto↔Ticket (creados por Claude via API):
CRÍTICO — estos WFs asocian contactos a tickets automáticamente. Cada uno tiene
un bug conocido o lógica frágil documentada abajo. No modificar sin entender
el impacto en los datos históricos ya cargados.

  WF "Asociar Inquilino al Ticket (Incumplimientos)"
  Script creador: 02_Incumplimientos/scripts/crear_wf_asociar_inquilino.js
  Trigger: ticket creado en pipeline 3353793749
  Lógica: lee `dni_inquilino` del ticket → busca contacto por `numero_de_documento`
          con limit:1 → asocia con tipo GENÉRICO `ticket_to_contact` → copia
          email del contacto a `email_inquilino` en el ticket
  ⚠ BUG CONOCIDO: `limit:1` toma el primer resultado si hay DNIs duplicados en
    ADMIN (múltiples contactos con el mismo número de documento). El tipo
    genérico `ticket_to_contact` no asigna rol "Inquilino" — la asociación
    queda sin label. Causa que aparezcan cogarantes u otros como inquilino.
  Estado en portal: verificar ID en HubSpot — fue creado y activado manualmente

  WF "Asociar Ticket Padre/Hijo (Incumplimientos)"
  Script creador: 02_Incumplimientos/scripts/wf_asociar_tickets_padre_hijo.js
  Fixes aplicados: fix_wf_padre_hijo.js, fix_wf_padre_hijo_v2.js, fix_wf_padre_hijo_v3.js
  Trigger: cambio en `nro_expediente` en ticket del pipeline 3353793749
  Lógica: busca tickets con mismo DNI+expediente → el más antiguo (ID menor) = padre,
          resto = hijos → asocia con typeId 45 (padre→hijo) y 46 (hijo→padre) USER_DEFINED
  Estado: lógica correcta, múltiples fixes iterativos al criterio de "padre"

  WF "Copiar datos Ticket al Contact (Incumplimientos)"
  Script creador: 02_Incumplimientos/scripts/wf_copiar_ticket_a_contacto.js
  Trigger: lista de tickets en pipeline 3353793749 (sin re-enrollment)
  Lógica: busca contact por `correo_del_propietario` con limit:1 → copia 15
          propiedades del ticket al contacto (dni_inquilino, deudas, nombres, etc.)
  ⚠ BUG CONOCIDO: `limit:1` puede tomar el contact equivocado si hay emails
    duplicados. Además, escribe datos del inquilino en el contacto del propietario.

  WF "Correo Propietario en Pago en Proceso (Incumplimientos)"
  Script creador: 02_Incumplimientos/scripts/wf_correo_propietario.js
  Fix aplicado: 02_Incumplimientos/scripts/fix_wf_correo_propietario.js
  Trigger: ticket en stage "Pago en proceso" (4596051185) + sin `correo_del_propietario`
  Lógica original: lee contacts asociados al ticket → excluye el que tiene DNI
    igual a `dni_inquilino` → toma el primero restante como propietario
  Lógica fix: usa LABELS de asociación para identificar roles correctamente:
    Labels excluir: 33=Inquilino, 35=Cogarante, 43=Solicitante
    Labels preferir: 31=Propietario, 41=Vendedor Inmobiliaria
  ⚠ ATENCIÓN: si las asociaciones del WF "Asociar Inquilino" no tienen labels
    (tipo genérico), este WF no puede distinguir roles correctamente tampoco.

Resumen del problema de datos de asociación (detectado 09/2026):
- Raíz: "Asociar Inquilino" usa limit:1 + tipo genérico sin label de rol
- Consecuencia: cogarantes, inmobiliarias u otros contactos aparecen en el
  ticket en lugar del inquilino correcto, o mezclados sin distinción de rol
- Fix necesario: cambiar asociación genérica por tipo con label "Inquilino"
  (verificar typeId correcto en HubSpot Associations v4) y considerar qué
  hacer si hay DNIs duplicados (alertar vs. no asociar automáticamente)

Tabla de labels de asociación Contact↔Ticket (USER_DEFINED, según fix):
  31 = Propietario  |  33 = Inquilino  |  35 = Cogarante
  41 = Vendedor Inmobiliaria  |  43 = Solicitante

Carta de pago (WF 4377587939 — ✅ ACTIVO desde 14/08/2026):
- Custom code: 02_Incumplimientos/custom_code_carta_pago.js
- Flujo: Google Docs template → reemplaza placeholders → PDF → Drive → SMTP
- PDF también sube a HubSpot Files v3 (/cartas-de-pago/) y se adjunta como
  nota en el ticket vía engagements v1
- Usa: GOOGLE_KEY_1/2, GOOGLE_SA_EMAIL, HS_SMTP_USER, HS_SMTP_PASS
- Template Doc ID: 1LWhpPEsJEOcUT7RGnuBnH8VTW4z6wusUynjCuWz3IKY
- Placeholder único en template: {{DETALLE_DEUDAS}} (bloque dinámico con conceptos > $0)

Equipo Mora 1:
- Marina Miño y Valeria Gallardo son los gestores principales del pipeline de tickets
- Tickets se asignan rotativamente entre ellas (salvo creación manual a un tercero)
- Mora 1 gestiona el nexo entre inquilino e inmobiliaria para resolver el impago:
  puede ser alquiler, expensas, luz, gas, agua (AYSA), ABL u otros conceptos
- Mora 2 NO es Mora 1: Mora 2 gestiona el recupero de los fondos que FINAER
  desembolsó en Mora 1, y opera sobre deals, no sobre tickets

Equipo Mora 2:
- Leandro Rinaldi, Débora Romero, Florencia Velazco

Wizard notificación (notificacion-incumplimiento.html):
- Proxy Cloudflare ✅ operativo: https://finaer-hs-proxy.ovargas-ec2.workers.dev (CM-261 cerrado)
- Landing ID: 430264653040 | Form ID: 16350864-6359-4241-9d44-d8639a7af726
- MIGRACIÓN: entra en producción el 21/09/2026. A partir de esa fecha el formulario
  original (/incumplimientos, ID 238233670842) queda obsoleto y se depreca.

Logo FINAER (fix aplicado 09/2026):
- Se rompió el logo en ambas landings por cambio de assets en el template
- Solución: JS onerror en headHtml que reemplaza el src roto con URL real
- PNG extraído de finaer_logo_garantias.svg → subido a HubSpot Files v3
  URL pública: https://145725856.fs1.hubspotusercontent-eu1.net/hubfs/145725856/logos/logo-finaer.png
- Script: 02_Incumplimientos/scripts/upload_logo_finaer.js
- 430264653040 → fix PUBLICADO | 467413433582 → fix en DRAFT (era draft)

Verificación de facturas — Mora 1 (vía asistente personal):
- Bottleneck operativo: el equipo compara manualmente los importes declarados
  en las propiedades de deuda del TICKET contra los montos de las facturas adjuntas
- Propiedades de deuda en ticket (objeto Ticket, pipeline 3353793749):
    deuda_alquiler, deuda_expensas, deuda_luz, deuda_aysa, deuda_gas, deuda_abl
  (NO son propiedades de deal — monto_desembolso y monto_recupero son de Mora 2)
- El asistente puede automatizar el cruce: lee las propiedades del ticket, lista
  adjuntos (obtenerArchivosTicket), lee cada factura (leerArchivoHubSpot), extrae
  los importes por concepto y los compara contra las propiedades de deuda
- Resultado por concepto: "Luz: ticket $100.000 / factura $80.000 — diferencia $20.000"
  o "Todos los conceptos coinciden ✓"
- Mora 2 NO aplica — ellos gestionan el recupero post-pago, no verifican facturas

Restricciones críticas WF 4504390847 (formulario → ticket):
- Re-enrollment DEBE estar activo. Sin re-enrollment el mismo contacto solo dispara
  el WF una vez — envíos subsiguientes del mismo notificante no crean ticket.
- Secretos en custom code: acceder como process.env.token (NO event.secrets —
  esa sintaxis era Node.js 18.x y falla en 20.x).
- Notas en tickets: usar engagements v1 (POST /engagements/v1/engagements con
  ticketIds en associations). CRM v3 (POST /crm/v3/objects/notes con
  associationTypeId: 218) devuelve 201 pero la nota no aparece — falla
  silenciosamente.
- Adjuntos de ticket: GET /engagements/v1/engagements/associated/ticket/{id}/paged
  → eng.attachments[].id → GET /files/v3/files/{id} para metadata y URL
  Implementado en hs.js: obtenerArchivosTicket(ticketId)

ADMIN — sistema interno de FINAER:
- ADMIN es el sistema de gestión interno de FINAER (backoffice).
- ADMIN crea TODOS los contactos (objeto Contact) en HubSpot vía integración API.
  Por eso todos los contactos tienen hs_object_source_label = INTEGRATION.
- Todos los prospectos de FINAER llegan al CRM desde ADMIN — no hay prospectos
  creados por formulario nativo, carga manual u otra fuente en flujo normal.
- Consecuencia práctica: filtrar contactos por hs_object_source_label = INTEGRATION
  equivale a filtrar TODOS los contactos/prospectos de FINAER.

SAI — qué es y por qué aparece en los logs:
- SAI = Sistema de Autogestión de Inmobiliarias. Producto propio de FINAER donde
  las inmobiliarias pueden ver sus expedientes, incumplimientos y datos en línea.
- SAI tiene una integración propia con HubSpot (private app "Finaer CRM Argentina
  Integration") para sincronizar datos ADMIN↔HubSpot, y crea deals de período
  via API directa.
- SAI NO crea tickets. Los tickets los crea el equipo vía formularios.
- El token de SAI se REUTILIZA en WFs de custom code (ej: WF 4504390847 del wizard).
  Por eso los tickets creados por el wizard aparecen con fuente "Integración con SAI"
  — es el token que se usa, no que SAI haya creado el ticket.
- Impacto: tickets del wizard son indistinguibles de posibles tickets de SAI en logs.

Agente Prejudicial (Breeze AI) — NO activado. No activar sin test completo
y configuración de transferencia a humanos.

Deuda técnica conocida — lógica de negocio:
- DOBLE MOTOR DE PUNITORIOS: coexisten WF 4172304610 (sobre Deal, trigger:
  tasa_punitorio + fecha_desembolso + fecha_negociacion) y WF 4231647440
  (sobre Ticket, trigger: fecha_de_inicio_de_mora + fecha_negociacion). Usan
  fechas de origen distintas y pueden generar valores contradictorios entre
  Ticket y Deal sin error visible. Corrección pendiente: unificar en un solo
  motor. No tocar estos WFs sin entender cuál de los dos domina en cada caso.
- WF PLACEHOLDER VACÍO: WF 4205935816 "Recálculo Diario Punitorios (08:00 AM)"
  está DESACTIVADO y sin acciones desde mayo 2026 — nunca se completó.
  No activar ni eliminar sin definir la lógica de recálculo diario.
- MONTO_RECUPERO STALE: 367 deals en pipeline 3403406575 tienen monto_recupero
  cargado con datos pre-producción. Limpiar en batch ANTES de activar WF 4128732405
  (Pedido Recupero) para evitar crear 367 Pedidos de golpe.
- TOTAL_RECUPERADO A ESCALA DUDOSA: 368 deals tienen valores que parecen divididos
  por 1000 (ej: 1.428,86 en vez de 1.428.860). Sin investigar causa raíz.

── 03_CONTRATOS 📋 En validación ────────────────────────────────────────────
Ruta: Desktop/HubSpot/03_Contratos/
Propuesta presentada a FINAER, esperando aprobación para implementar.

Diseño:
- Trigger: fecha_firma_fianza en Deal de ventas → crea Deal en pipeline
- Asignación rotativa + notificación al ejecutivo asignado
- Pipeline: Pendiente → En gestión → Emitido

── 04_SINOR 🚫 Deprecado al 24/04/2026 ─────────────────────────────────────
Ruta: Desktop/HubSpot/04_Sinor/
Scripts conservados. Reactivar solo si se confirma continuidad.

── 05_TABLEROS COMERCIALES ✅ Operativo (parcial) ───────────────────────────
Ruta: Desktop/HubSpot/05_Tableros-Comerciales/

- WF tracking de cambio de estado (ID: 4274339056): activo desde 19/05/2026
- Snapshot cartera semanal: script corre lunes 10am via Task Scheduler
- Pipeline Métricas de Cartera: ID 3765616829
- Dashboard "Tableros Comerciales": 3 reportes activos (cartera por estado,
  movimientos semanales, últimos cambios)
- Dataset [TEST]: 16 empresas ficticias, sacar filtro "observaciones contiene
  testing" para ver datos reales
- Pendiente: reportes de operaciones, visitas, propiedad `grupos` (desde admin)

Restricciones operativas:
- WFs viejos desactivados (IDs 2527675600 y 2539720942) — de una persona que ya
  no está, con código, sin documentación. NO eliminar sin revisar qué hacían.
- Snapshot cartera corre en Windows Task Scheduler de la PC local de Franco
  (lunes 10am). Si la PC está apagada ese día, no hay snapshot semanal.

── 06_RRHH-CAPACITACION-HUMAND ✅ Operativo ─────────────────────────────────
Ruta: Desktop/HubSpot/06_RRHH-Capacitacion-Humand/
Landing: landing.finaersa.com.ar/es/capacitacion-humand

- Formulario de inscripción: líderes inscriben recursos a 4 turnos de capacitación
- Control de cupos: custom code suma recursos por turno, alerta vía Task
- Operativo al 16/06/2026
- CSV de reportes en carpeta con fechas (22/06, 26/06, 29/06, 03/07)

── 07_STICKERS ⏳ Pendiente publicar landing ─────────────────────────────────
Ruta: Desktop/HubSpot/07_Stickers/

- Wizard 5 pasos: EDC/ODC registran solicitudes de piezas de marketing
- Código completo: formulario_stickers.html
- Form nativo HubSpot GUID: 2b527eac-0b46-4908-9c70-8047d3bf9f46
- 13 propiedades Contact creadas (sticker_*)
- Pendiente: crear landing HubSpot y publicar URL al equipo

── 09_JUDICIALES ⏳ Listo — pendiente aprobación abogada ────────────────────
Ruta: Desktop/HubSpot/09_Judiciales/

Envío masivo de emails a deudores judicializados (ejecución y desalojo).
- Script: send_emails.js — lee Excel, filtra placeholders, envía por SMTP raw
- FROM: judiciales@finaersa.com.ar | SMTP token: HS_SMTP_USER/PASS en .env
- Templates HTML en templates/ (aprobados por abogada en reunión 13/08/2026)
- Destinatarios válidos: 65 ejecución | 621 desalojo (base 23/07/2026)
- Por cada envío: busca contacto en HubSpot → crea engagement EMAIL si existe
- Genera CSV log por corrida (fecha, estado, en_crm)
- CRÍTICO: nunca enviar sin aprobación explícita de Franco

── 08_ALUMNI-RUGBY 🏉 Operativo ─────────────────────────────────────────────
Ruta: Desktop/HubSpot/temp_alumni/ (sin carpeta definitiva aún)
Campaña de marketing. Landing + formulario de adhesión/sorteo vía Instagram.

- Landing: landing.finaersa.com.ar/alumni-rugby-finaer (ID: 418423524581)
- Form ID: 5f289291-4310-4385-8302-bf1a2944df63
- Propiedades Contact creadas: usuario_en_ig (texto), perfil_inquilino_alumni
  (enum: propietario/inquilino_actual/futuro_propietario/futuro_inquilino/ninguna)
- Estado: publicada desde 09/06/2026
- Scripts de construcción en temp_alumni/ — candidatos a archivar

================================================================================
CAPACIDADES HUBSPOT DE FRANCO (probadas en producción)
================================================================================

Objetos y modelado de datos:
- Propiedades custom (texto, enumeración, fecha, número, booleano)
  en Contacts, Companies, Deals, Tickets
- Relaciones entre objetos (asociaciones)
- Lógica de objetos según representación de negocio
- Objetos HubSpot: Orders/Pedidos (0-123), Associations v4

Automatización:
- Workflows multi-paso con ramificaciones condicionales
- Triggers por propiedad, formulario, etapa de pipeline
- Re-enrollment con lógica específica
- Copy de propiedades entre objetos (Contact→Deal, Company→Deal, Ticket→Deal)
- Asignación rotativa de propietarios | Notificaciones automáticas
- Custom code actions (Node.js) en workflows — búsquedas, batch updates,
  creación de objetos, notas, asociaciones

API y operaciones técnicas (vía Claude Code):
- HubSpot Automation API v4 (GET/PUT/POST/paginar workflows)
  CRÍTICO: PUT requiere el flow completo. PowerShell corrompe sourceCode grande
  con ConvertTo-Json → usar curl + sed para ediciones quirúrgicas de WFs.
- CRM Properties API v3 (creación/edición/sincronización)
- CRM Search API (filtros complejos, paginación)
- Batch updates de objetos (contacts, deals, tickets)
- HubSpot Forms API v3 (submit desde código)
- SMTP vía smtp.hubapi.com:587 (Transactional Email Add-on) — raw TCP/TLS
  con net + tls de Node.js (Single Send API no soporta adjuntos binarios)
- Google Docs API v1 (replaceAllText via batchUpdate)
- Google Drive API v3 (copy, export PDF, multipart upload, delete)
  Nota: siempre usar supportsAllDrives=true en shared drives
- Google Service Account JWT (RS256) — crypto.createPrivateKey PKCS8
  en Node.js 20/OpenSSL 3.x (NO usar createSign().sign() con PEM directo)
- Windows Task Scheduler para scripts Node.js locales (snapshot cartera)
- Cloudflare Workers como proxy para CRM API (token server-side)

Landings HubSpot:
- headHtml/footerHtml pattern para wizards y formularios custom
- HubSpot Forms embed (hbspt.forms.create) con onBeforeFormSubmit
- Multiselect con Choices.js | Formularios multi-paso en HTML puro

Principio rector: Nativo primero. El código es el último recurso.
Toda solución debe ser mantenible sin dependencia técnica permanente.

Responsabilidades exclusivas de Claude (no delegar a Franco):
- Actualizar el sourceCode de un WF via Automation API v4 (PUT flow completo)
- Crear WFs via API
- Hacer batch updates de objetos CRM
Activar/desactivar un WF (toggle isEnabled) sí lo hace Franco desde la UI.

================================================================================
QUÉ NO HACER
================================================================================

- No proponer soluciones que antes requerían Operations Hub sin verificar
  primero que Data Hub Pro lo habilita (re-testear antes de asumir)
- No asumir que algo en HubSpot funciona — validarlo vía API o en el portal
- No hacer cambios en el portal de producción sin confirmación explícita
- No crear archivos ni código que no fueron pedidos explícitamente
- No resumir al final de cada respuesta lo que acabás de hacer
- No activar el Agente Prejudicial sin completar test y configuración
  de transferencia a humanos
- No hardcodear tokens ni credenciales en ningún archivo — siempre process.env
  ✅ RESUELTO 29/07/2026: 62 archivos migrados a process.env. Tokens rotados.

================================================================================
PROTOCOLO DE REPO Y SESIÓN DE TRABAJO
================================================================================

Al arrancar una sesión:
  Verificar git status + git log -5. Si hay cambios sin commitear de una sesión
  anterior, avisar antes de continuar — no asumir que quedó guardado.

Al escribir cualquier script que use una API externa:
  Tokens y credenciales SIEMPRE por process.env, nunca hardcodeados en el archivo.
  Si el archivo a modificar ya tiene un token escrito a mano, avisar antes de
  modificarlo — no replicarlo en el archivo nuevo.

Antes de crear un script nuevo:
  Buscar si existe un archivo con propósito similar en la carpeta. Si hay versiones
  anteriores del mismo fix (_v2, _v3), informarlo — no generar otra versión sin
  confirmar qué pasa con las anteriores.

Separación investigación vs. producción:
  Scripts de análisis puntual NO van en scripts/ mezclados con código operativo.
  Si la pregunta se puede responder con el conector MCP de HubSpot en el chat,
  usarlo — no generar un archivo. Si hay que guardarlo: subcarpeta _archivo/.

Al cerrar una sesión donde se tocó código:
  Informar qué archivos se crearon o modificaron, cuáles están commiteados y
  cuáles no. Si algún código va a correr en producción, hacer el commit en esa
  sesión, no dejarlo pendiente.
