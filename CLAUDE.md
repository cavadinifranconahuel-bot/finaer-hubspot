# FINAER — HubSpot Operations
# Franco Cavadini | Arquitecto de Operaciones CRM
# Versión 2.0 | Abril 2026

================================================================================
ROL DE CLAUDE EN ESTE PROYECTO
================================================================================

Socio técnico y estratégico en la operación y evolución del sistema HubSpot
de FINAER. Pensás conmigo, cuestionás lo que no tiene sentido operativo, y
ayudás a construir soluciones que el equipo pueda usar sin fricción.

Idioma: siempre español. Sin excepciones.

Para el proyecto de la consultora personal de Franco, ver:
Desktop/Franco Cavadini/CLAUDE.md

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
- Transactional Email Add-on (~EUR 425/mes): sin uso documentado
No se pueden dar de baja hasta enero 2027. Buscar forma de darles uso.

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

Backlog:
- Dashboard de actividad comercial (visitas por ejecutivo, estado, zona)
- Alertas por falta de visita según estado de la empresa
- Resultado de visita → cambio de estado automático en la empresa
- RE-TESTEAR serverless functions (Data Hub Pro ahora disponible)

── 02_INCUMPLIMIENTOS ✅ Operativo ──────────────────────────────────────────
Ruta: Desktop/HubSpot/02_Incumplimientos/
Capacitación con el área completa: 27/04/2026

Lógica de negocio:
- Ticket = incumplimiento operativo (resolver el impago del cliente)
- Deal = seguimiento económico interno (gestión de fondos de FINAER)
- Origen: formulario → mesa de ayuda → asignación rotativa al equipo
  prejudicial

Workflows:
- WF4 (ID: 3654117624): Ticket "Pago en proceso" → crea Deal automático
- WF2 (ID: 3962960072): copia 16 propiedades Ticket → Deal
- Pedidos automáticos: monto_desembolso → pérdida | monto_recupero → recupero

Pipelines:
- Tickets: ID 3353793749 | Deals: ID 3403406575

Estado al 26/04/2026:
- Sistema completamente operativo
- Reporte "Pedidos de Fondos" activo (reemplaza Excel estático a Tesorería)
- Vista del Deal para el gestor: pendiente
- Limpieza propiedades Nahuel Martiñan: planificada

Agente Prejudicial (Breeze AI) — en configuración, NO activado:
- Nombre: Asistente Finaer
- Conocimiento: agente_prejudicial_conocimiento.txt (cargado)
- 5 categorías: Incumplimiento nuevo | Seguimiento sin respuesta |
  Escalada legal | Reclamo | Aviso/Documentación
- Transferencia a humanos: pendiente de configurar
- Test: pendiente
- Activación: decisión pendiente

Backlog:
- Formulario con campos condicionales por tipo de deuda (factibilidad alta)
- Chatbot como alternativa al formulario (factibilidad alta, Service Hub Pro)
- Breeze Customer Agent para correos (en configuración)

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

================================================================================
CAPACIDADES HUBSPOT DE FRANCO (probadas en producción)
================================================================================

Objetos y modelado de datos:
- Propiedades custom (texto, enumeración, fecha, número, booleano)
  en Contacts, Companies, Deals, Tickets
- Relaciones entre objetos (asociaciones)
- Lógica de objetos según representación de negocio

Automatización:
- Workflows multi-paso con ramificaciones condicionales
- Triggers por propiedad, formulario, etapa de pipeline
- Re-enrollment con lógica específica
- Copy de propiedades entre objetos (Contact→Deal, Company→Deal, Ticket→Deal)
- Asignación rotativa de propietarios | Notificaciones automáticas

API y operaciones técnicas (vía Claude Code):
- HubSpot Automation API v4 (GET/PUT/POST workflows)
- CRM Properties API v3 (creación/edición/sincronización)
- Batch updates de objetos (contacts, deals)

Principio rector: Nativo primero. El código es el último recurso.
Toda solución debe ser mantenible sin dependencia técnica permanente.

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
