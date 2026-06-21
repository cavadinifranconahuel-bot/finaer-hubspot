# Gestión de Incumplimientos — Punitorios y Fixes
## Log de Implementación: Cálculo de Punitorios + Correcciones
**Fecha:** 2026-05-04
**Etapa:** Módulo de punitorios construido — WF pendiente de activación

---

## CONTEXTO

Dos avances sobre el sistema existente al 24/04:
1. **Fix de timing** detectado entre WF4 (crea Deal) y WF2 (copia propiedades)
2. **Módulo de punitorios** — cálculo automático de intereses por mora sobre los casos activos

---

## 1. FIX DE TIMING — WF2

### Problema detectado
WF4 y WF2 disparan sobre el mismo trigger (Ticket → "Pago en proceso"):
- WF4 tiene un delay de **2 minutos** antes de crear el Deal
- WF2 tiene un delay de **1 minuto** antes de copiar propiedades al Deal

Al minuto 1, WF2 intenta escribir en el Deal asociado, pero WF4 todavía no lo creó. El Deal no existe → WF2 no copia nada → el Deal queda vacío de propiedades del Ticket.

### Solución
Aumentar el delay de WF2 de 1 minuto a **5 minutos**, garantizando que WF4 siempre haya creado y asociado el Deal antes de que WF2 intente escribir.

### Estado
**⏳ Pendiente de aprobación** — el fix está identificado y documentado, no aplicado aún.

---

## 2. MÓDULO DE PUNITORIOS

### Lógica de negocio (fuente: Vero — líder del área)

| Concepto | Tasa | Plazo de gracia | Base de cálculo |
|---|---|---|---|
| Alquiler | 0.5% diario | 5 o 10 días (según contrato) | `deuda_alquiler` en el Deal |
| Servicios (expensas, gas, luz, ABL) | 0.1% diario | Sin plazo — desde el día 1 | Suma de conceptos en el Deal |
| Tasa BNA / Doble BNA | Manual | Variable | Fuera del cálculo automático por ahora |

**Fórmulas:**
```
punitorio_alquiler  = alquiler × 0.005 × max(0, días_desde_desembolso - plazo)
punitorio_servicios = (expensas + gas + luz + abl) × 0.001 × días_desde_desembolso
total_punitorios    = punitorio_alquiler + punitorio_servicios
```

**Fecha de inicio del cálculo:** fecha en que Vero ejecuta el pago (fecha del Excel de pedido de fondos).

### Propiedades creadas

#### En Deal — grupo `incumplimientos_seguimiento`
| Propiedad | Tipo | Quién la completa |
|---|---|---|
| `fecha_desembolso` | Fecha | Gestor (cuando Vero ejecuta el pago) |
| `plazo_punitorio` | Enumeración: 5 días / 10 días | Gestor (según contrato) |
| `tasa_punitorio` | Enumeración: 0.5% diario / Tasa BNA / Doble BNA | Gestor |
| `punitorio_alquiler` | Número | Calculado automáticamente por WF |
| `punitorio_servicios` | Número | Calculado automáticamente por WF |
| `total_punitorios` | Número | Calculado automáticamente por WF |

#### En Ticket — grupo `ticketinformation`
| Propiedad | Tipo | Para qué |
|---|---|---|
| `punitorio_alquiler` | Número | Visibilidad del equipo prejudicial + Pedidos de Fondos |
| `punitorio_servicios` | Número | Visibilidad del equipo prejudicial + Pedidos de Fondos |
| `total_punitorios` | Número | Visibilidad del equipo prejudicial + Pedidos de Fondos |

### Workflow de cálculo

**Nombre:** WF — Cálculo Punitorios Seguimiento de Deuda
**ID:** 4172304610
**Estado:** ⏳ DESACTIVADO — pendiente de completar configuración en UI

**Trigger:**
- Pipeline = Incumplimientos - Seguimiento de deuda
- Tasa punitorio = 0.5% diario
- Fecha de desembolso es conocida *(agregado manualmente en UI)*

**Reinscripción:** activada cuando cambia `fecha_desembolso`

**Acción:** Custom code (Node.js 20.x) que:
1. Lee `fecha_desembolso`, `plazo_punitorio`, `alquiler`, `expensas`, `gas`, `luz`, `abl` del Deal
2. Calcula `punitorio_alquiler`, `punitorio_servicios`, `total_punitorios`
3. Escribe los tres valores en el **Deal**
4. Busca el **Ticket asociado** (via associations API) y escribe los mismos valores

**Propiedades de entrada configuradas en la acción:**
`fecha_desembolso`, `plazo_punitorio`, `alquiler`, `expensas`, `gas`, `luz`, `abl`

### Script de recálculo diario
**Archivo:** `scripts/calcular_punitorios_wf.js` — pendiente de crear
**Propósito:** Recalcular punitorios de todos los deals activos con `fecha_desembolso` conocida y `tasa = 0_5_diario`
**Scheduling:** A definir — mismo mecanismo que `snapshot_cartera.js` (Programador de Tareas)

---

## FLUJO COMPLETO ACTUALIZADO

```
Formulario (propietario/inmobiliaria)
    ↓
Ticket creado → asignación rotativa → equipo prejudicial gestiona
    ↓
Ticket llega a "Pago en proceso"
    ↓
WF4 (delay 2 min) → crea Deal "Prejudicial – {DNI}"
WF2 (delay 5 min*) → copia 17 propiedades Ticket → Deal
    ↓
Gestor completa en el Deal:
  - monto_desembolso → genera Pedido de pérdida (pago a propietario)
  - fecha_desembolso + plazo_punitorio + tasa_punitorio
    ↓
WF Punitorios → calcula punitorio_alquiler + punitorio_servicios + total
  → escribe en Deal y en Ticket asociado
    ↓
Reporte "Pedidos de Fondos" (incluye punitorios)
```
*delay de WF2 pendiente de aplicar (hoy está en 1 min)

---

## PENDIENTES

| Tarea | Estado |
|---|---|
| Aplicar fix delay WF2: 1 min → 5 min | ⏳ Pendiente aprobación |
| Activar WF Punitorios (ID: 4172304610) | ⏳ Pendiente — revisar código en UI primero |
| Script de recálculo diario de punitorios | ⏳ Por construir |
| Agregar punitorios al reporte Pedidos de Fondos | ⏳ Por definir |
| Vista del Deal para el gestor | ⏳ Pendiente (viene del backlog anterior) |
| Limpieza propiedades Nahuel Martiñan | ⏳ Planificada |

---

## DECISIONES TOMADAS

| Decisión | Justificación |
|---|---|
| Tasa BNA fuera del cálculo automático | Requiere consulta externa (calculadora jusbaires.gob.ar). Se ingresa manualmente por ahora |
| Punitorios en Deal Y en Ticket | El Deal es para el gestor interno. El Ticket es para el equipo prejudicial y para el reporte de Pedidos de Fondos |
| Recálculo diario via script externo (no WF) | HubSpot no soporta re-enrollment time-based en este tipo de workflow. El patrón de script semanal (snapshot_cartera.js) ya está probado |
| Propiedades de input solo en Deal | `fecha_desembolso`, `plazo_punitorio` y `tasa_punitorio` las completa el gestor en el Deal. El Ticket solo recibe los resultados calculados |

---

## REFERENCIAS

- Doc anterior: `2026-04-24_estado_completo_y_backlog.md`
- Script WF: `scripts/crear_wf_punitorios.js`
- Pipeline Tickets: 3353793749 | Pipeline Deals: 3403406575
- WF4: 3654117624 | WF2: 3962960072 | WF Punitorios: 4172304610
