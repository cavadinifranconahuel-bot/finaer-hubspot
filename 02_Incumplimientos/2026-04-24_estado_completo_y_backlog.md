# Gestión de Incumplimientos — Seguimiento de Deuda
## Log de Estado Completo + Backlog
**Fecha:** 2026-04-24  
**Etapa:** Sistema operativo — capacitación final pendiente + backlog de mejoras definido

---

## CONTEXTO DE NEGOCIO

**Problema que resuelve:**  
Gestionar el proceso completo desde que un inquilino/solicitante genera un incumplimiento de pago hasta que FINAER recupera los fondos que desembolsó para resolverlo.

**Dos objetos, dos propósitos distintos:**

| Objeto | Para quién | Para qué |
|---|---|---|
| **Ticket** | Equipo prejudicial | Resolver el impago del cliente (inquilino) hacia el propietario/inmobiliaria |
| **Deal** | Equipo interno | Gestionar los fondos que desembolsó FINAER y el recupero posterior |

**Origen del flujo:**  
Un formulario conectado a la **bandeja de entrada / mesa de ayuda de HubSpot** recibe la notificación de impago del propietario o inmobiliaria. Al completarse, se crea un Ticket que se asigna de manera **rotativa** a los miembros del equipo prejudicial.

**Flujo completo:**
```
Formulario (propietario/inmobiliaria)
    ↓
Ticket creado → asignación rotativa → equipo prejudicial gestiona
    ↓
Ticket llega a etapa "Pago en proceso"
    ↓
Deal creado automáticamente (nombre: "Prejudicial – {DNI}")
Deal recibe 16 propiedades del Ticket vía WF2
    ↓
Gestor completa monto_desembolso → se genera Pedido de pérdida (pago a propietario)
Gestor completa monto_recupero → se genera Pedido de recupero (devolución del cliente)
    ↓
Reporte "Pedidos de Fondos" exportado por el líder del área → enviado a Tesorería
```

**Reporte "Pedidos de Fondos":**  
Reemplaza el Excel estático que se usaba antes. Incluye: conceptos de deuda detallados, número de expediente y datos bancarios del propietario/inmobiliaria. El líder del área lo exporta y lo envía al área de Tesorería para efectuar las transferencias. La condición para que funcione correctamente es que las propiedades de deuda en el Ticket lleguen completas y con montos reales — no el total global.

---

## ESTADO DEL SISTEMA AL 2026-04-24

| Componente | Estado |
|---|---|
| Formulario → mesa de ayuda de HubSpot | ✅ Operativo |
| Asignación rotativa al equipo prejudicial | ✅ Operativo |
| Pipeline de Tickets "Incumplimientos" (ID: 3353793749) | ✅ Operativo |
| Pipeline de Deals "Seguimiento de Deuda" (ID: 3403406575) | ✅ Operativo |
| WF4 (ID: 3654117624): Ticket "Pago en proceso" → crea Deal | ✅ Operativo |
| WF2 (ID: 3962960072): copia 16 propiedades Ticket → Deal | ✅ Operativo |
| Propiedades de deuda en Deal (incl. aysa y entrega de llaves) | ✅ Creadas |
| Pedidos automáticos (monto_desembolso / monto_recupero) | ✅ Operativo |
| Reporte "Pedidos de Fondos" | ✅ Operativo |
| Bugs 1-6 (isClosed, STATIC_VALUE, CONTACT_FLOW) | ✅ Resueltos |
| Vista del Deal para el gestor del piloto | ⏳ Pendiente |
| Limpieza propiedades de Nahuel Martiñan | ⏳ Planificada |

**Próximo evento:** Capacitación con el área completa — **lunes 27/04/2026**

---

## BACKLOG — MEJORAS FUTURAS

### Pendiente 1 — Formulario con campos condicionales por tipo de deuda

**Problema actual:** El formulario recibe el tipo de incumplimiento (`tipo_de_incumplimiento`) pero no el detalle del monto por concepto. El ticket llega con el monto total pero sin desglose. El asesor prejudicial tiene que solicitar el detalle por mail al propietario.

**Solución propuesta:** Agregar lógica condicional al formulario — cuando el usuario selecciona un tipo de incumplimiento, aparece automáticamente un campo de importe asociado (ej: selecciona "Alquiler" → aparece "Monto alquiler"). Cada campo mapea directamente a la propiedad de deuda correspondiente en el Ticket.

**Factibilidad:** Alta. HubSpot Forms soporta dependent fields de manera nativa. Verificar si el formulario de Help Desk admite esta lógica o si hay que migrar a un formulario de Marketing que también cree tickets.

---

### Pendiente 2 — Chatbot en lugar del formulario (alternativa al Pendiente 1)

**Problema que resuelve:** El mismo que el formulario condicional, pero de forma más guiada y amigable para propietarios/inmobiliarias que no son técnicos.

**Solución propuesta:** Reemplazar el formulario por un HubSpot Chatflow. El bot hace preguntas paso a paso y cada respuesta mapea a una propiedad del Ticket. La siguiente pregunta se adapta según la respuesta anterior (ej: si dice que hay deuda de alquiler, pregunta el monto; si no, pasa al siguiente concepto).

**Factibilidad:** Alta. HubSpot Chatflows disponible en la mayoría de los planes de Service Hub. Puede crear tickets y poblar propiedades directamente.

**Nota:** Evaluar cuál implementar entre Pendiente 1 y Pendiente 2 — son alternativos, no complementarios. El chatbot es la opción más completa pero requiere más configuración.

---

### Pendiente 3 — Agente IA para responder correos en la bandeja prejudicial

**Problema actual:** La bandeja de entrada del área prejudicial recibe correos de distinto tipo, no solo notificaciones de incumplimiento. El equipo tiene que procesar y responder manualmente.

**Solución propuesta:** Implementar el **Breeze Customer Agent** de HubSpot, entrenado con el tipo de consultas y respuestas del área prejudicial. Respondería automáticamente los correos que identifica como gestionables y escalaría los que no puede resolver.

**Factibilidad:** Media — depende del plan. Requiere **Service Hub Professional o Enterprise**. Verificar el plan actual de FINAER antes de avanzar.

---

## DECISIONES Y APRENDIZAJES ACUMULADOS

Ver documentos anteriores:
- `2026-04-17_analisis_estado_actual.md` — relevamiento completo, bugs 1 y 2, arquitectura legacy
- `2026-04-20_implementacion_workflows_etapa2.md` — WF2 reconstruido, bugs 3-6, propiedades nuevas en Deal
