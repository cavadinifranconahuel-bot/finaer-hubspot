# Gestión de Incumplimientos — Seguimiento de Deuda
## Log de Implementación: Workflows Ticket → Deal
**Fecha:** 2026-04-20  
**Etapa:** Etapa 2 — Construcción del objeto Negocios (continuación del análisis del 2026-04-17)

---

## CONTEXTO

**Problema abordado:**  
Construir el puente automático entre el Ticket (donde vive la gestión operativa y los montos de deuda) y el Deal (donde vive el seguimiento económico). Cuando un Ticket llega a "Pago en proceso", el Deal asociado debe quedar poblado con toda la información del caso sin intervención manual del gestor.

**Proceso impactado:**  
Ticket llega a etapa "Pago en proceso" → Deal recibe propiedades del Ticket → Gestor opera sobre el Deal con contexto completo

**Herramientas involucradas:**  
- HubSpot Automation API v4 (`/automation/v4/flows`)  
- HubSpot Properties API v3 (`/crm/v3/properties`)  
- WF2 (ID: 3962960072) — "Propiedades Ticket > Negocios (Seguimiento de Deuda)"  
- WF descartado (ID: 3962923242) — "Campos del Ticket > Negocio"

---

## IMPLEMENTACIÓN

### 1. Nuevas propiedades creadas en el Deal

Grupo creado: `incumplimientos_seguimiento`

| Propiedad | Tipo | Propósito |
|---|---|---|
| `dni_inquilino` | Número | Identificación del inquilino en el Deal para cruzar con historial |
| `fecha_desde_que_adeuda` | Fecha | Período de inicio de la deuda — clave para reporting temporal |
| `id_de_deuda` | Texto | ID único del caso de deuda — detecta reincidencia (70% uso en Tickets) |

### 2. WF2 reconstruido — "Propiedades Ticket > Negocios" (ID: 3962960072)

**Tipo:** `PLATFORM_FLOW` (Ticket-triggered)  
**Trigger:** Ticket en pipeline `3353793749` llega a etapa `4596051185` ("Pago en proceso")  
**revisionId final:** 21  
**Total de acciones:** 17 (delay + 16 copias de propiedades)

**Cadena completa (Ticket → Deal via associationTypeId 28):**

| # | Propiedad fuente (Ticket) | Propiedad destino (Deal) | Fix aplicado |
|---|---|---|---|
| 1 | `nro_expediente` | `nro_expediente` | — |
| 2 | `codigo_de_garantia` | `codigo_de_garantia__clonada_` | ✓ Fix: era STATIC_VALUE |
| 3 | `monto_total_de_la_deuda_acumulada` | `monto_total_de_la_deuda` | ✓ Fix: fuente incorrecta |
| 5 | `deuda_alquiler` | `alquiler` | Nuevo |
| 6 | `deuda_expensas` | `expensas` | Nuevo |
| 7 | `deuda_gas` | `gas` | Nuevo |
| 8 | `deuda_luz` | `luz` | Nuevo |
| 9 | `deuda_abl` | `abl` | Nuevo |
| 10 | `alias_cbu_impagos` | `alias` | Nuevo |
| 11 | `banco` | `banco` | Nuevo |
| 12 | `nombre_y_apellido_del_inquilino` | `nombre_y_apellido_del_inquilino` | Nuevo |
| 13 | `tipo_de_incumplimiento` | `tipo_de_incumplimiento` | Nuevo |
| 15 | `id_de_deuda` | `id_de_deuda` | Nuevo |
| 16 | `fecha_desde_que_adeuda` | `fecha_desde_que_adeuda` | Nuevo |
| 17 | `dni_inquilino` | `dni_inquilino` | Nuevo |
| 18 | `hs_createdate` | `fecha_de_creacion_del_ticket` | Nuevo |

> Todas las acciones usan `type: OBJECT_PROPERTY`. Ninguna usa `STATIC_VALUE`.

### 3. WF "Campos del Ticket > Negocio" deshabilitado (ID: 3962923242)

**Estado anterior:** activo (`isEnabled: true`)  
**Estado actual:** deshabilitado (`isEnabled: false`, `revisionId: 33`)  
**Motivo:** reemplazado en su totalidad por WF2. Ver sección de Bugs para el detalle de problemas que tenía.

---

## ERRORES / BUGS DETECTADOS Y RESUELTOS

### Bug 3 — WF2: `codigo_de_garantia__clonada_` usaba STATIC_VALUE
- **Síntoma:** `"staticValue": "{{ enrolled_object.codigo_de_garantia }}"` — template token tratado como texto literal
- **Impacto:** el Deal recibía el string `{{ enrolled_object.codigo_de_garantia }}` en lugar del valor real
- **Causa raíz:** error de construcción original — se usó STATIC_VALUE en lugar de OBJECT_PROPERTY
- **Solución:** cambiado a `"type": "OBJECT_PROPERTY", "propertyName": "codigo_de_garantia"`

### Bug 4 — WF2: fuente de `monto_total_de_la_deuda` incorrecta
- **Síntoma:** copiaba desde `monto_total_de_la_deuda` (propiedad que no existe en Ticket) en lugar de `monto_total_de_la_deuda_acumulada` (la propiedad calculada real)
- **Impacto:** el campo monto llegaba vacío al Deal
- **Solución:** corregida la fuente a `monto_total_de_la_deuda_acumulada`

### Bug 5 — WF 3962923242: arquitectura incorrecta (CONTACT_FLOW)
- **Síntoma:** workflow configurado como `CONTACT_FLOW` (objectTypeId: 0-1) para copiar datos de Ticket a Deal
- **Impacto estructural:** cuando el trigger se dispara, el workflow selecciona el Ticket "más recientemente modificado" del contacto — si el inquilino tiene múltiples tickets en el pipeline, puede copiar datos del ticket equivocado
- **Bugs adicionales dentro del WF:**
  - `banco` y `nombre_y_apellido_del_inquilino`: STATIC_VALUE en lugar de FETCHED_OBJECT_PROPERTY
  - Acción 21: duplicado exacto de acción 20 (`abl`), sin `nextActionId` — cortaba la cadena
  - `monto_total_de_la_deuda`: fuente incorrecta (mismo bug que WF2)
- **Solución:** workflow deshabilitado. WF2 (Ticket-triggered) cubre todo su alcance con mejor arquitectura

### Bug 6 — `fecha_de_creacion_del_ticket` no existe como propiedad de Ticket
- **Síntoma:** al intentar copiar esta propiedad como fuente desde el Ticket, la API retornó `PROPERTY_NOT_FOUND`
- **Causa raíz:** `fecha_de_creacion_del_ticket` es solo una propiedad del Deal — el campo equivalente en Ticket es la propiedad nativa `hs_createdate`
- **Solución:** en WF2, acción 18 usa `"propertyName": "hs_createdate"` como fuente → `fecha_de_creacion_del_ticket` en Deal

---

## DECISIONES TOMADAS

| Decisión | Justificación |
|---|---|
| Deshabilitar WF 3962923242 en lugar de corregirlo | WF2 (Ticket-triggered) hace lo mismo con arquitectura correcta. Mantener ambos genera sobreescrituras y confusión |
| Reutilizar propiedades `alquiler`, `expensas`, `gas`, `luz`, `abl` del modelo de Nahuel | Tienen los tipos correctos (número). Se conservan en el Deal en lugar de crear duplicados. La limpieza de nombre es una mejora cosmética que puede hacerse en la etapa de limpieza |
| No copiar `deuda_aysa` ni `deuda_por_entrega_de_llaves` | No hay propiedades receptoras en el Deal para estos conceptos. Requiere definición en la etapa de propiedades del Deal (pendiente) |
| `hs_createdate` como fuente para `fecha_de_creacion_del_ticket` | Es la propiedad nativa del Ticket. No existe un campo custom equivalente en Tickets — ni tiene sentido crearlo |

---

## PENDIENTES — PRÓXIMOS PASOS

- [x] Corregir Bug 1: etapa "Judicial" del Ticket → `isClosed: false` ✅
- [x] Corregir Bug 2: etapa "Incobrable" del Deal → `isClosed: true` ✅
- [ ] Definir y crear propiedades para `deuda_aysa` y `deuda_por_entrega_de_llaves` en el Deal
- [ ] Analizar reporte "Pedidos de Fondos" — estructura, columnas, filtros
- [ ] Configurar vista del Deal para el gestor del piloto
- [ ] Planificar etapa de limpieza de propiedades de Nahuel (análisis ya realizado en sesión anterior)

---

## APRENDIZAJES CLAVE

- **`STATIC_VALUE` con template tokens es un bug silencioso:** HubSpot acepta el workflow sin errores, pero en runtime el campo recibe el string literal `{{ ... }}` en lugar del valor. Solo se detecta inspeccionando el JSON del workflow vía API
- **Siempre verificar que la propiedad fuente existe en el objeto correcto antes de mapear:** `fecha_de_creacion_del_ticket` era una trampa — existía en Deal pero no en Ticket. La API de propiedades individual (`/crm/v3/properties/{object}/{property}`) es la forma más rápida de validar
- **CONTACT_FLOW para copiar datos de Ticket a Deal es un antipatrón:** el workflow selecciona el objeto asociado más reciente, no el que disparó el evento. En modelos donde un contacto puede tener múltiples tickets abiertos, esto genera inconsistencias silenciosas
- **Un PLATFORM_FLOW (Ticket-triggered) es siempre preferible** cuando el evento de interés ocurre en el Ticket

---

## OPORTUNIDADES IDENTIFICADAS

- `deuda_aysa` y `deuda_por_entrega_de_llaves` todavía no tienen propiedades receptoras en el Deal — cuando se creen, solo hay que agregar 2 acciones al final de WF2 (cadena ya preparada)
- WF2 ahora tiene la cadena completa y limpia: agregar nuevas copias de propiedades en el futuro es mecánico (agregar acción al final, actualizar `nextAvailableActionId`)

---

## RESUMEN EJECUTIVO

Se construyó el workflow central del seguimiento de deuda: cuando un Ticket entra en "Pago en proceso", el Deal asociado recibe automáticamente 16 propiedades del Ticket — montos por concepto, datos bancarios de transferencia, identificación del caso e inquilino. Se corrigieron 4 bugs en los workflows existentes (2 de tipo STATIC_VALUE, 1 de fuente de propiedad incorrecta, 1 de arquitectura). El workflow CONTACT_FLOW que existía en paralelo fue deshabilitado por ser arquitectónicamente incorrecto para este caso de uso. El gestor del piloto ahora puede abrir un Deal y encontrar todo el contexto del caso sin completar nada manualmente.
