# Inventario completo y validado de Workflows — Incumplimientos & Seguimiento de Deuda
**Fecha de auditoría:** 08/06/2026 — **Método:** lectura directa vía Automation API v4 (`GET /automation/v4/flows`), no documentación previa.

> Este documento reemplaza como fuente de verdad cualquier descripción de workflows en docs anteriores (2026-04-20, 2026-04-24, 2026-05-04, 2026-05-11, backlog_fase2). Esos docs quedaron desactualizados — el portal siguió evolucionando después de escritos (ej: el WF de Punitorios en Ticket se creó el 11/05, justo en el borde de la última doc).

---

## 0. Mapa de Pipelines y Etapas (IDs verificados)

### Pipeline Tickets — Incumplimientos (ID `3353793749`)
| Orden | Etapa | Stage ID |
|---|---|---|
| 0 | Nuevo | `4596051183` |
| 1 | Solicitud de Información | `5148154067` |
| 2 | En gestión | `4596051184` |
| 3 | Pago en proceso | `4596051185` |
| 4 | Judicial | `4596051186` |
| 5 | Cerrado | `4594251972` |

*(Nota: "Solicitud de Información" se agregó 07/04/2026 — no estaba en el inventario inicial de pipeline)*

### Pipeline Deals — Seguimiento de Deuda (ID `3403406575`)
| Orden | Etapa | Stage ID |
|---|---|---|
| 0 | En recupero | `4660102351` |
| 1 | En recupero con Carta Documento | `4660102352` |
| 2 | Recupero Parcial | `4660102353` |
| 3 | Plan de pagos | `5163331806` |
| 4 | Recupero total (cerrado) | `4660102354` |
| 5 | Pase a Judiciales (cerrado) | `4660102355` |

### Otros pipelines relevantes
- **Pedidos/Orders:** pipeline `3747645676`, stage `5225013434`
- **Visitas Comerciales (Deals):** pipeline `3588863210`, stage `4921967837`
- **Pipeline de ventas/garantías (Deals):** identificado internamente como `pipeline === 'default'` en custom code — el Deal "de garantía" original del inquilino vive ahí
- Ticket pipeline `3754148035` aparece referenciado junto a `3353793749` solo en el WF "Nombre del Ticket — Incumplimientos" — pendiente de identificar qué representa (posible pipeline secundario o heredado)

---

## 1. FLUJO COMPLETO — Ciclo de vida de un Ticket de Incumplimiento

```
Formulario de impago
       │
       ▼
Ticket creado en pipeline 3353793749, etapa "Nuevo" (4596051183)
       │
       ├─► WF "Nombre del Ticket — Incumplimientos" (4128651499)
       │   → subject = "Incumplimiento - {nombre_y_apellido_del_inquilino} - DNI {dni_inquilino}"
       │
       ├─► WF "Envío de notificación de nuevo ticket #3" (3654089938)
       │   → asigna owner rotativo desde team 162346297
       │   → notifica in-app a user 29334871: "Nuevo ticket de Incumplimiento asignado"
       │
       ├─► WF "Creación de ID de deuda" (3974287591)
       │   → delay 1 min → id_de_deuda = {dni_inquilino}
       │
       ├─► WF "Asociar Inquilino al Ticket" (4216300737)  [dispara cuando dni_inquilino se conoce]
       │   → delay 2 min → CUSTOM CODE:
       │      1. busca Contact por nro_documento_txt = DNI
       │      2. asocia Inquilino al Ticket (assocTypeId 33)
       │      3. busca el Deal de garantía del inquilino (pipeline === 'default')
       │      4. asocia la Company de ese Deal al Ticket (assocTypeId 26, HUBSPOT_DEFINED)
       │      5. replica TODOS los contactos del Deal de garantía al Ticket,
       │         mapeando roles: Propietario(12→31), Inquilino(4→33),
       │         Cogarante(9→35), Vendedor Inmobiliaria(40→41), Solicitante(38→43)
       │
       ├─► WF "Notificación de Incumplimiento próximo a vencer" (3920492793)
       │   → delay 3 días → tarea/notif a user 29334871:
       │     "lleva 3 días notificado legalmente, próximo a cumplir los 5 días"
       │
       ├─► WF "Notificación de Incumplimiento vencido" (3920499955)
       │   → delay 5 días → notif a user 29334871: "lleva 5 días notificado legalmente"
       │
       └─► WF "workflow Id interno > Id Inmo" (4053037250)
           → delay 10 min → id_inmobiliaria = {fetched_object.id_interno}
           (trae el id_interno desde la inmobiliaria asociada)

  ════════ Cuando el Ticket pasa a "Pago en proceso" (4596051185) ════════

       ├─► WF4 "Creación de Negocio para Seguimiento de Deuda" (3654117624)
       │   → delay 1 min → CREATE Deal en pipeline 3403406575, etapa
       │     "En recupero" (4660102351)
       │     dealname = "{nro_expediente} {nombre_y_apellido_del_inquilino}"
       │     + 5 reglas de copia de asociaciones (Ticket→Deal):
       │       16→3, 339→341, 27(ENROLLED_OBJECT), 33→4, 35→9
       │
       └─► WF2 "Propiedades Ticket → Negocio (Seguimiento de Deuda)" (3962960072)
           → re-enrolla ante cambios de propiedades. Cadena de copia
             (18 pasos, vía associationTypeId 28, todas OBJECT_PROPERTY):
             nro_expediente, codigo_de_garantia→codigo_de_garantia__clonada_,
             [delay 2 min], deuda_alquiler→alquiler, deuda_expensas, deuda_gas,
             deuda_luz, deuda_abl, nombre_y_apellido_del_inquilino,
             tipo_de_incumplimiento, id_de_deuda, fecha_desde_que_adeuda,
             dni_inquilino, hs_createdate→fecha_de_creacion_del_ticket,
             deuda_aysa (x2, pasos 19 y 21),
             deuda_por_entrega_de_llaves,
             monto_total_de_la_deuda_acumulada→monto_desembolso (último paso)

  ════════ Cálculo de Punitorios — DOS sistemas paralelos activos ════════

  (A) "WF — Cálculo Punitorios Seguimiento de Deuda" (4172304610) — sobre el DEAL
      Trigger: pipeline=3403406575 AND tasa_punitorio="0_5_diario"
               AND fecha_desembolso conocida AND fecha_negociacion conocida
      → calcula días entre fecha_desembolso y fecha_negociacion
      → escribe punitorio_alquiler / punitorio_servicios / total_punitorios
        en el DEAL, y TAMBIÉN busca el Ticket asociado vía
        /crm/v3/objects/deals/{id}/associations/tickets y replica los
        mismos valores ahí.

  (B) "WF — Calculo Punitorios en Ticket" (4231647440) — sobre el TICKET
      [creado 11/05/2026 — el que Franco señaló, no documentado antes]
      Trigger: hs_pipeline=3353793749 AND fecha_de_inicio_de_mora conocida
               AND fecha_negociacion conocida
      → calcula días entre fecha_de_inicio_de_mora y fecha_negociacion
      → fórmulas:
          punitorio_alquiler  = round(deuda_alquiler × 0.005 × días, 2)
          punitorio_servicios = round((expensas+gas+luz+abl+aysa+llaves) × 0.001 × días, 2)
          total_punitorios    = round(alquiler + servicios, 2)
      → escribe directo en el TICKET (no depende de ningún Deal)

  ⚠️ HALLAZGO CLAVE: ambos sistemas conviven, usan FECHAS DE ORIGEN DISTINTAS
     (fecha_desembolso vs. fecha_de_inicio_de_mora) y pueden pisarse o generar
     valores contradictorios entre Ticket y Deal según cuál corra primero o
     cuál condición se cumpla. Ver sección 4 — riesgos.

  ════════ Cierre ════════

       └─► WF "Ticket: Fecha de cierre = Fecha traspaso a Cerrado" (4021593331)
           Trigger: hs_v2_date_entered_4594251972 (fecha de entrada a "Cerrado") conocida
           → closed_date = hs_v2_date_entered_4594251972
```

---

## 2. FLUJO — Deal "Seguimiento de Deuda" (post-creación)

```
Deal creado por WF4 en etapa "En recupero"
       │
       ├─► WF "Asignación automática de negocios — Seguimiento de deuda" (4243737799)
       │   → STATIC_BRANCH sobre `pipeline`; si = 3403406575 → delay 5 min →
       │     asigna owner rotativo entre user_ids [34194585, 29822627, 29822625]
       │     (overwrite_current_owner = true)
       │
       ├─► WF "Asociar Inquilino al Deal — Seguimiento de Deuda" (4217782484)
       │   → CUSTOM CODE — misma lógica que (4216300737) pero Deal→Deal:
       │     busca Contact por DNI, asocia Inquilino (assocType 4),
       │     ubica el Deal de garantía (pipeline 'default'), replica
       │     Company (assocType 6) y todos los contactos con mapeo
       │     Deal→Deal idéntico (12→12, 4→4, 9→9, 40→40, 38→38)
       │
       ├─► "Pedido Desembolso — Incumplimientos" (4128739569)
       │   Trigger: monto_desembolso > 0
       │   → crea Order (0-123) en pipeline 3747645676 / stage 5225013434
       │     hs_order_name = "Desembolso - {nombre_y_apellido_del_inquilino}"
       │     hs_total_price = {monto_desembolso} | tipo_pedido = "desembolso"
       │     asociado vía assocTypeId 512 (ENROLLED_OBJECT)
       │
       └─► "Pedido Recupero — Incumplimientos" (4128732405)
           Trigger: monto_recupero > 0
           → mismo patrón, hs_order_name = "Recupero - ..." | tipo_pedido = "recupero"
```

---

## 3. Sistemas DESACTIVADOS pero construidos (no eliminar sin revisar)

### Mails automáticos — DOBLE sistema, ninguno activo
**Sobre Tickets** (todos `isEnabled: false`):
- `4217716964` "WF — Mail 1 Notificación Incumplimiento al Inquilino" → trigger etapa "Nuevo" (4596051183)
- `4229726403` "WF — Mail 2 Notificación Pago realizado x FINAER" → trigger etapa "Pago en proceso" (4596051185)
- `4217491688` "WF — Mail 3 Carta Documento al Inquilino" → trigger etapa "Judicial" (4596051186)

**Sobre Deals** (separado, también desactivado):
- `4217453802` "WF — Mail 3 Envío de CD" → trigger dealstage = `4660102352` ("En recupero con Carta Documento")

⚠️ Hay relación funcional Mail 3 (Ticket, etapa Judicial) ≈ Mail 3 CD (Deal, etapa "Carta Documento") — ambos existen, ambos apagados, podrían ser duplicados pensados para dos objetos distintos del mismo evento de negocio. Revisar antes de activar cualquiera para no enviar doble correo.

### Otros desactivados / incompletos
- `4205935816` "WF — Recálculo Diario Punitorios (08:00 AM)" — **DESACTIVADO y SIN ACCIONES** (`actions: []`). Trigger configurado (pipeline 3403406575 AND tasa_punitorio="0_5_diario" AND fecha_desembolso conocida) pero el cuerpo nunca se completó. Es un placeholder, no un WF funcional.

---

## 4. Riesgos y contradicciones detectadas (para discutir con Franco)

1. **Doble sistema de Punitorios activo simultáneamente** (Deal `4172304610` + Ticket `4231647440`):
   - Disparan con condiciones distintas (`tasa_punitorio="0_5_diario"` + `fecha_desembolso` vs. `fecha_de_inicio_de_mora`)
   - El del Deal ADEMÁS escribe sobre el Ticket asociado — puede chocar/sobreescribir lo que calculó el WF del Ticket (o viceversa, según orden de ejecución y triggers)
   - Mismo campo de salida (`punitorio_alquiler`, `punitorio_servicios`, `total_punitorios`) en el mismo objeto, alimentado por dos motores con fórmulas e inputs distintos → alto riesgo de inconsistencia silenciosa
   - **Esto probablemente explica por qué el ticket 418872825061 mostraba punitorio = 0**: sus condiciones de disparo pueden no coincidir exactamente entre ambos sistemas (ej. si `tasa_punitorio` no está seteado en el Deal asociado, el WF (A) nunca corre y no “fuerza” el cálculo; y si el WF (B) sólo corre por cambio de propiedad con re-enrollment y las fechas se cargaron en otro momento/orden, puede haber quedado sin re-disparar)

2. **Sistema de Mails duplicado y completamente apagado** — construido en ambos objetos (Ticket y Deal) para momentos de negocio similares (Carta Documento), nada activo.

3. **WF de recálculo diario sin terminar** (`4205935816`) — apagado y vacío, sugiere que el cálculo de punitorios "vivo día a día" (no sólo al cargar fechas) quedó pendiente.

4. **Pipeline ticket `3754148035`** referenciado en un solo WF junto al principal — no identificado, podría ser un pipeline heredado/de prueba que conviene confirmar si sigue en uso.

---

## 5. Otros workflows activos relevantes (Visitas Comerciales / Contactos)

- `4092196041` "Crear Deal desde Formulario" — 5 formularios por estado de empresa (confirma arquitectura de 5 forms)
- `4092075245` "Actualizar URL de Formulario" — sobre Companies, según `estado_de_actividad`
- `4092141776` / `4102341828` / `4122060012` — asociación Deal↔Company y asignación de propietario en Visitas Comerciales (pipeline 3588863210)
- `3928776953` "Estado de Inmobiliaria > Negocios" — sobre pipeline 3588863210
- `3738332393` "Notificación de Formulario de Adhesión"
- `2165856499` "Registro de Cita por envío de formulario"

---

## 6. IDs operativos de referencia

- **Notificaciones de tickets / vencimientos:** user `29334871`
- **Pool rotativo de asignación de tickets:** team `162346297`
- **Pool rotativo de owners de Deal (Seguimiento de Deuda):** users `34194585`, `29822627`, `29822625`
- **Mapeo de roles asociación (Deal de garantía → Ticket/Deal de seguimiento):**
  Propietario `12`, Inquilino `4`, Cogarante `9`, Vendedor Inmobiliaria `40`, Solicitante `38`
  → al Ticket se traducen como `31`, `33`, `35`, `41`, `43` respectivamente (USER_DEFINED)
  → al Deal de seguimiento se mantienen idénticos (`12→12`, `4→4`, etc.)

---

**Fuente:** Automation API v4 (`/automation/v4/flows`), 100 workflows totales en el portal, lectura completa de criterios de enrollment, acciones y código custom de los ~35 workflows operativamente relevantes a Incumplimientos / Seguimiento de Deuda / Visitas Comerciales.
