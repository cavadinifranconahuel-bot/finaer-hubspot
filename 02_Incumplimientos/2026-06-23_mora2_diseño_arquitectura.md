# Mora 2 — Diseño de arquitectura: recorrido y decisiones
**Fecha:** 23/06/2026
**Participantes:** Franco Cavadini + Claude
**Estado:** Diseño validado — implementación pendiente (jueves 26/06)

---

## Punto de partida

Franco llegó a esta sesión sabiendo que tenía que "gestionar Mora 2 en HubSpot" pero sin tener claro qué significaba eso en términos de datos, objetos y flujos. El punto de partida fue una pregunta abierta: ¿cómo funciona Mora 2 hoy?

Lo que emergió:

- **Mora 1:** el área prejudicial resuelve el impago. Cierra cuando FINAER desembolsa. Genera un Deal en el pipeline de Seguimiento de Deuda (3403406575).
- **Mora 2:** el asesor de morosos trabaja el recupero de lo que FINAER desembolsó. Tiene un plan de pagos, negociación de cuotas, alertas por vencimiento.
- **Mora 3:** si no recupera → carta documento → judicial.

Hasta esta sesión, la gestión de Mora 2 era completamente manual. HubSpot solo tenía el pipeline de Seguimiento de Deuda (1 deal por ticket cerrado) sin ninguna lógica de agrupación ni período.

---

## Problema raíz identificado

Un inquilino puede deber alquiler de mayo, junio y julio. Cada mes genera uno o más tickets que, al cerrarse, generan un deal. Resultado: **el asesor de Mora 2 ve 3-6 deals del mismo expediente sin saber cuál es el actual, cuánto se debe en total, ni cómo segmentar los períodos para la carta documento**.

El proceso de diseño fue:

1. **Analizar los documentos reales** — carta documento PDF + CSV Pedido de Fondos.
2. **Mapear qué datos ya existen** vs qué falta crear.
3. **Diseñar para el usuario** (mínima carga manual, máxima visibilidad en un clic).
4. **Garantizar que el diseño de Mora 2 no rompa la operación de Mora 1**.

---

## Decisión clave: un deal por período, no uno por ticket

El primer diseño instintivo era: deal por ticket cerrado (como ya funciona). El problema: si hay 3 tickets de alquiler de mayo, el asesor ve 3 deals separados del mismo mes. Imposible consolidar sin trabajo manual.

**Decisión:** un deal por mes (período) por expediente. Si llega un segundo ticket del mismo período → el deal ya existente se nutre (suma de conceptos). El deal nuevo no se crea.

Esto resuelve la carta documento: cada deal de período tiene exactamente los datos de un mes.

---

## Propiedad clave: `periodo_de_deuda`

Enumeración de meses: "Enero 2026", "Febrero 2026", ... en el objeto **Ticket**.
La completa el ejecutor de Mora 1 (o viene del formulario).

Esta propiedad es el eje del sistema:
- Determina a qué deal de período asociar un ticket.
- Resuelve el desglose mensual de la carta documento.
- Reemplaza el campo "fechas de la que adeuda" en el formulario (que era texto libre ambiguo).

**No reemplaza** `fecha_de_inicio_de_mora`, que sigue siendo la base para calcular punitorios.

---

## Arquitectura final — 3 niveles

```
Deal MAESTRO (pipeline nuevo — 1 por expediente)
│   Totales globales acumulados de todos los períodos
│   Plan de pagos: tipo_acuerdo, fecha_cuota_1/2/3, monto_cuota_1/2/3, estado_cuota_1/2/3
│   Nota automática: cada vez que cierra un mes → resumen del período + recuperos
│
├── Deal PERÍODO (pipeline 3403406575 — 1 por mes por expediente)
│   Nombre: "[nro_expediente] — [Nombre Inquilino] — [periodo_de_deuda]"
│   Conceptos consolidados del mes: alquiler, expensas, gas, luz, ABL, AYSA
│   Punitorios calculados por WF existente (4172304610)
│   El asesor solo toca fecha_negociacion para recalcular
│   Nota automática: cada vez que se nutre con un ticket nuevo
│
└── Tickets (múltiples por mes — ya existen)
    Fuente de verdad para carta documento (con periodo_de_deuda como columna)
    Alimentan el deal de período al cerrarse
```

---

## Flujo del sistema

```
Ticket cerrado con "Resultado: Pago total FINAER / Pago parcial FINAER"
  + periodo_de_deuda = "Mayo 2026"
  + nro_expediente = "A-XXXXX"
↓
WF "nutrir o crear deal período":
  Busca: ¿existe deal en 3403406575 con mismo nro_expediente + mismo periodo_de_deuda?
  → SÍ: suma conceptos del ticket al deal existente + crea nota en deal de período
  → NO: crea deal de período nuevo + asocia al deal maestro + crea nota
        Si tampoco existe deal maestro → lo crea también
↓
WF "actualizar deal maestro":
  Trigger: cambio en propiedades del deal de período
  Acción: suma totales de todos los deals del expediente → actualiza deal maestro
  + nota en deal maestro si corresponde cierre de mes (trigger: etapa "Gestionado")
```

---

## Notas automáticas — diseño

### En el deal de período
**Trigger:** cada vez que se nutre con un nuevo ticket (en el WF nutrir/crear).
**Contenido:**
```
[Fecha y hora actual]
Se sumó concepto desde ticket #[ID]:
  Alquiler: $XXX.XXX
  Expensas: $XX.XXX
  ...
  Total acumulado del período: $XXX.XXX

Nota: ticket registrado el [fecha] — pertenece a [periodo_de_deuda]
```
El timestamp de la nota revela automáticamente si se cargó fuera de período (deuda de mayo cargada en junio).

### En el deal maestro
**Trigger:** deal de período pasa a etapa "Gestionado" (o equivalente — a definir con el equipo).
**Contenido:**
```
[Fecha]
Cierre período [periodo_de_deuda]:
  Total período: $XXX.XXX (alquiler + servicios + punitorios)
  Recuperos registrados este mes: $XXX.XXX
  Saldo pendiente del expediente: $XXX.XXX
```
Objetivo: entrar al deal maestro y en un vistazo entender la evolución completa del expediente sin abrir cada deal de período.

---

## Cambio en el trigger de creación del deal

**Antes (Mora 1):** WF4 (3654117624) crea el deal cuando el ticket llega a etapa "Pago en proceso".
**Nuevo (Mora 2):** el deal de período se crea cuando el ticket llega a **Cerrado** con resultado "Pago total FINAER" o "Pago parcial FINAER".

Esto cambia el trigger en WF4 o se crea un WF paralelo para Mora 2 (recomendado: WF nuevo para no tocar el flujo operativo existente).

---

## Baches identificados y cómo resolverlos

### 1. Tickets existentes sin `periodo_de_deuda`
Los tickets que ya están en el sistema no tienen esta propiedad. Si uno cierra con "Pago FINAER" después de la implementación, el WF no sabe a qué deal de período asignarlo.
**Resolución:** fallback en el custom code — si `periodo_de_deuda` está vacío, inferir el mes desde `fecha_de_inicio_de_mora`. Anotar en el deal de período que el período fue inferido, no declarado.

### 2. El wizard también tiene que actualizarse
El formulario de notificación nativo recibe `periodo_de_deuda` como enumeración. El wizard HTML (`notificacion-incumplimiento.html`) es un sistema separado — requiere actualización independiente.

### 3. Deals existentes (1 por ticket) quedan fuera de la nueva arquitectura
Los deals que ya están en el pipeline con el esquema antiguo (1 deal por ticket) no encajan en la nueva estructura.
**Decisión:** nueva arquitectura solo para casos que nazcan después de la implementación. Los existentes se gestionan hasta que cierren naturalmente.

### 4. Delay en la actualización del deal maestro
Cuando el asesor actualiza `fecha_negociacion` en un deal de período y los punitorios se recalculan, el deal maestro puede estar desactualizado por minutos hasta que el WF corra.
**Impacto:** bajo. El asesor trabaja en el deal de período para eso, no en el maestro. Hay que comunicarlo al equipo.

### 5. Un mes por ticket es una regla de negocio
Si una inmobiliaria notifica "alquiler de marzo y abril" en el mismo ticket, la arquitectura se rompe (un ticket no puede pertenecer a dos períodos).
**Resolución:** comunicar la regla al equipo de Mora 1 antes de activar. Si llega un ticket así → el ejecutor lo divide en dos tickets manualmente.

---

## Reporte Carta Documento (Mora 3)

Fuente: tickets (no deals de período).
La diferencia con el Pedido de Fondos es mínima:
- Agrega columna `periodo_de_deuda` para el desglose mensual del alquiler.
- Agrega `punitorio_servicios` (que en Mora 1 no se incluye — solo en judicial).
- Agrupa por `nro_expediente`.

El 85% de los datos de la carta documento ya estaban en el CSV del Pedido de Fondos.

---

## Pendientes de implementación (para el jueves 26/06)

### Franco en UI de HubSpot:
- [ ] Crear propiedad `periodo_de_deuda` en Tickets (enumeración: meses del año, al menos 2025 y 2026)
- [ ] Crear pipeline nuevo para deals maestros de expediente
- [ ] Crear propiedades del deal maestro: totales globales, plan de pagos (tipo_acuerdo, monto_cuota_1/2/3, fecha_cuota_1/2/3, estado_cuota_1/2/3, monto_recuperado)

### Construcción de workflows:
- [ ] WF "nutrir o crear deal período" (custom code — el más complejo)
- [ ] WF "actualizar deal maestro" (custom code)

### Para después del jueves:
- [ ] `periodo_de_deuda` en el wizard HTML
- [ ] WFs de alerta por fechas de cuotas vencidas
- [ ] Nota en deal maestro al cerrar mes (requiere definir qué etapa = "cierre de mes")
- [ ] Activar WF reasignación por DNI Tickets (ID: 4453767417) — miércoles 24/06
- [ ] Activar WF reasignación por DNI Deals (ID: 4454895830) — timing a confirmar

---

## Scripts generados en esta sesión

| Archivo | Función | Estado |
|---|---|---|
| `scripts/batch_recalcular_punitorios.js` | Math.ceil a punitorios con decimales en deals + tickets | Ejecutado en producción — 29 deals + 387 tickets corregidos |
| `scripts/wf_reasignar_deals_por_dni.js` | Crea WF de reasignación por DNI para Deals | Ejecutado — WF ID 4454895830, desactivado |
