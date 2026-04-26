# Gestión de Incumplimientos — Seguimiento de Deuda
## Log de Avance: Análisis Estado Actual
**Fecha:** 2026-04-17  
**Etapa:** Análisis previo a implementación del objeto Negocios (Etapa 2 del piloto)

---

## CONTEXTO

**Problema abordado:**  
Definir qué hay que construir en el objeto Deals (Negocios) para cubrir el seguimiento económico del piloto. Antes de crear cualquier propiedad o workflow, se realizó un relevamiento completo del estado real del portal.

**Proceso impactado:**  
Flujo completo: Ticket (incumplimiento) → Deal (seguimiento de deuda) → Pedido (movimiento de dinero)

**Herramientas involucradas:**  
HubSpot Sales Hub — pipeline Deals "Incumplimientos - Seguimiento de deuda" (ID: 3403406575) + pipeline Tickets "Incumplimientos" (ID: 3353793749)

---

## IMPLEMENTACIÓN

### Lo que ya está construido (Etapa 1 — Tickets)

El flujo de Tickets está operativo. Cubre:
- Creación desde formulario de incidencias
- Gestión operativa (correos, notas, adjuntos, propiedades)
- Asociaciones: inmobiliaria (Company), inquilino (Contact), cogarante (Contact)
- Propiedad bisagra: impacto económico (Sin impacto / Potencial / Real)
- Propiedades de deuda por concepto: `deuda_alquiler`, `deuda_expensas`, `deuda_gas`, `deuda_luz`, `deuda_abl`, `deuda_aysa`, `deuda_por_entrega_de_llaves`
- Propiedad calculada: `monto_total_de_la_deuda_acumulada` (suma automática de los 7 conceptos)
- Esta propiedad alimenta el **reporte "Pedidos de Fondos"** que se envía a Tesorería

### Estado del pipeline de Deals

| Etapa | ID | Estado configurado |
|---|---|---|
| Pago realizado | 4660102351 | Abierto |
| En recupero | 4660102352 | Abierto |
| Recupero parcial | 4660102353 | Abierto |
| Plan de pagos | 5163331806 | Abierto |
| Recupero total | 4660102354 | Cerrado ✓ |
| Incobrable | 4660102355 | **Abierto — BUG** |

### Estado del pipeline de Tickets

| Etapa | ID | Estado configurado |
|---|---|---|
| Nuevo | 4596051183 | Abierto |
| Solicitud de Información | 5148154067 | Abierto |
| En gestión | 4596051184 | Abierto |
| Pago en proceso | 4596051185 | Abierto — **trigger de creación del Deal** |
| Judicial | 4596051186 | **Cerrado — BUG** |
| Cerrado | 4594251972 | Abierto |

### Propiedades del Deal — creadas por Franco

| Propiedad | Tipo | Para qué |
|---|---|---|
| `alias` | Texto | CBU/Alias destino de la transferencia |
| `banco` | Texto | Banco destino |
| `cbu` | Número | Número de CBU |
| `nro_de_cuenta` | Número | Número de cuenta bancaria |
| `titular_de_la_cuenta_bancaria` | Texto | Titular de la cuenta |
| `monto_total_de_la_deuda` | Número | Total de la deuda |
| `mes_de_deuda` | Desplegable | Mes al que corresponde la deuda |
| `nombre_y_apellido_del_inquilino` | Texto | Nombre del inquilino |
| `tipo_de_incumplimiento` | Desplegable | Tipo |
| `fecha_de_creacion_del_ticket` | Fecha | Fecha de origen del caso |
| `pedido` | Desplegable | Tipo de Pedido |

### Workflows activos que alimentan el Deal

1. **Creacion de Negocio para Seguimiento de Deuda — Workflow #4** (ID: 3654117624)  
   Trigger: Ticket llega a etapa "Pago en proceso"  
   Acción: Crea Deal en etapa "Pago realizado", nombre "Prejudicial – {DNI}", copia propietario, asocia contactos y empresa

2. **Campos del Ticket > Negocio para seguimiento de deuda** (ID: 3962923242)  
   Copia del Ticket al Deal: `tipo_de_incumplimiento`, `fecha_de_creacion_del_ticket`, `nro_expediente`, `banco`, `abl`

3. **Propiedades Ticket (Incumplimientos) > Negocios (Seguimiento de Deuda)** (ID: 3962960072)  
   Detalle pendiente de analizar

### Arquitectura legacy de Nahuel Martiñan

Existe en el portal una arquitectura completa de workflows y propiedades construida por un colaborador anterior (Nahuel Martiñan). Esta arquitectura está **100% desactivada** y no afecta el funcionamiento actual.

- ~20 workflows de Negocios y Pedidos: todos con `isEnabled: false`
- Usaban integración externa (`FIELD_DATA`) — no copia de propiedades nativa
- Apuntaban a etapas de un pipeline diferente al actual
- Objeto Orders: todas sus propiedades custom son de Nahuel, no están en uso

La limpieza de estas propiedades está planificada en una etapa separada.

### Deals activos al momento del análisis
**163 deals** en el pipeline de Incumplimientos.

---

## ERRORES / BUGS DETECTADOS

### Bug 1 — Etapa "Judicial" del Ticket marcada como CLOSED
- **Síntoma:** `isClosed: true` en la etapa Judicial del pipeline de Tickets
- **Impacto:** Cuando un ticket escala a instancia judicial, HubSpot lo trata como cerrado. Desaparece de vistas activas, no genera alertas, y el SLA se detiene
- **Contradicción con el modelo:** el diseño establece que "el ticket puede escalar de instancia sin cerrarse ni duplicarse"
- **Acción pendiente:** cambiar `isClosed` a `false` en esa etapa

### Bug 2 — Etapa "Incobrable" del Deal NO marcada como CLOSED
- **Síntoma:** `isClosed: false` en la etapa Incobrable del pipeline de Deals
- **Impacto:** Deals declarados incobrables siguen apareciendo como activos en vistas y cuentan en métricas de cartera abierta
- **Acción pendiente:** cambiar `isClosed` a `true` en esa etapa

---

## DECISIONES TOMADAS

| Decisión | Justificación |
|---|---|
| Pedido = propiedades dentro del Deal (no Custom Object) | Operación manual, volumen no validado, sin casos confirmados de pagos múltiples por deuda. Revisar al escalar. |
| Propiedades de transferencia vacías en el Ticket se conservan | El equipo está en proceso de adopción. Se espera que se completen en el corto plazo. |
| No crear propiedades de deuda en el Deal | Ya existen en el Ticket. El Deal las recibe via workflow. No duplicar. |

---

## PENDIENTES — PRÓXIMOS PASOS

- [x] Corregir Bug 1: etapa "Judicial" del Ticket → `isClosed: false` ✅ (2026-04-20)
- [x] Corregir Bug 2: etapa "Incobrable" del Deal → `isClosed: true` ✅ (2026-04-20)
- [x] Leer detalle del workflow `Propiedades Ticket > Negocios` (ID: 3962960072) — ✅ reconstruido completo (2026-04-20)
- [x] Definir propiedades que faltan en el Deal — ✅ creadas `dni_inquilino`, `fecha_desde_que_adeuda`, `id_de_deuda` (2026-04-20)
- [ ] Definir propiedades para `deuda_aysa` y `deuda_por_entrega_de_llaves` en Deal
- [ ] Analizar reporte "Pedidos de Fondos" — estructura, columnas, filtros
- [ ] Configurar vista del Deal para el gestor del piloto
- [ ] Planificar etapa de limpieza de propiedades de Nahuel (análisis ya realizado)

---

## APRENDIZAJES CLAVE

- **Validar antes de proponer evita trabajo innecesario:** el análisis de exports + API evitó crear ~15 propiedades que ya existían en el portal
- **Filtrar por creador de propiedad es esencial:** sin ese filtro, el modelo de Nahuel se mezcla con el de Franco y genera decisiones incorrectas
- **Workflows desactivados ≠ inexistentes:** la arquitectura legacy ocupa espacio en el modelo de datos y genera confusión aunque no corra
- **`isClosed` en etapas es crítico:** determina visibilidad en vistas, comportamiento del SLA y métricas de reporting automático en HubSpot

---

## OPORTUNIDADES IDENTIFICADAS

- `monto_total_de_la_deuda_acumulada` (propiedad calculada) ya está operativa y en reporte → el Deal puede recibirla automáticamente del Ticket sin duplicar lógica
- `id_de_deuda` (70% de uso en Tickets) puede ser la clave para detectar reincidencia del mismo inquilino
- Etapa "Plan de pagos" en el Deal habilita reporting futuro: % de casos que requieren plan vs. pago único

---

## RESUMEN EJECUTIVO

Se relevó el estado completo del objeto Negocios antes de construir. El resultado: la mayoría de las propiedades necesarias ya existen en el Ticket (creadas en la Etapa 1), los workflows de creación del Deal están activos y funcionando, y hay 163 deals reales en el pipeline. Se identificaron dos bugs de configuración de etapas que afectan la visibilidad de casos. Existe una arquitectura legacy de un colaborador anterior que está desactivada pero genera ruido — tiene plan de limpieza. El próximo paso es terminar de mapear los workflows activos y definir las propiedades específicas que le faltan al Deal para el seguimiento económico completo.
