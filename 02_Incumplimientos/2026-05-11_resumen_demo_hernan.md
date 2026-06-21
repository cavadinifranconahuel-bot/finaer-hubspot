# Resumen Demo — Proceso de Incumplimientos en HubSpot
**Reunión:** Hernán Blanco | Mayo 2026
**Preparado por:** Franco Cavadini

---

## LO QUE SE CONSTRUYÓ

### 1. Entrada del caso — Formulario v2
- Formulario con datos del propietario, inquilino, código de garantía y conceptos de deuda
- Cada concepto tiene su propio monto y fecha desde que adeuda
- Al enviar: crea el Ticket automáticamente en el pipeline de Incumplimientos

---

### 2. Automatizaciones sobre el Ticket (Equipo Demora 1)

**Al crear el ticket:**
- El sistema busca al inquilino por DNI en la base de HubSpot
- Lo asocia automáticamente al ticket con etiqueta **Inquilino**
- Copia su email al ticket
- Envía un **correo automático al inquilino** informando que recibimos el reclamo

**Propiedades copiadas automáticamente al ticket:**
- Nombre y apellido del inquilino
- DNI
- Conceptos de deuda: alquiler, expensas, gas, luz, ABL, AYSA, entrega de llaves
- Fecha desde que adeuda por concepto
- Datos bancarios del propietario (CBU, banco, cuenta)
- Código de garantía / número de expediente

---

### 3. Escalada a Pago — Etapa "Pago en proceso"

Cuando el asesor D1 mueve el ticket a **Pago en proceso**:

1. **Se crea el Deal** en el pipeline Seguimiento de Deuda automáticamente
2. **Se copian 17 propiedades** del Ticket al Deal (montos, datos bancarios, inquilino, fechas)
3. **El inquilino queda asociado al Deal** con etiqueta Inquilino
4. **El monto total de la deuda** se copia automáticamente a `monto_desembolso`
5. **Se genera el Pedido de Fondos** automáticamente con ese monto
6. **Se envía un correo automático al inquilino** avisando que FINAER realizó el pago

---

### 4. Cálculo de Punitorios (Equipo Demora 2)

Cuando el asesor D2 va a negociar el recupero:

1. Completa `fecha_negociacion` en el Deal
2. El sistema calcula automáticamente:

```
Alquiler:   deuda_alquiler × 0.5% × max(0, días - plazo_gracia)
Servicios:  (expensas + gas + luz + abl + aysa) × 0.1% × días
Total:      punitorio_alquiler + punitorio_servicios
```

3. Los valores se escriben en el Deal **y** en el Ticket
4. El asesor D2 arranca la negociación sabiendo exactamente cuánto debe el inquilino incluyendo intereses

---

### 5. Escalada Legal — Etapa "Judicial"

Cuando el caso pasa a instancia judicial:
- **Se envía un correo automático al inquilino** notificando el envío de carta documento

---

## EL PRINCIPIO DE DISEÑO

> **Una acción del usuario = múltiples consecuencias automáticas**

| Acción del usuario | Consecuencias automáticas |
|---|---|
| Formulario enviado | Ticket + email al inquilino + inquilino asociado |
| Ticket → Pago en proceso | Deal + 17 propiedades copiadas + Pedido de fondos + email al inquilino |
| Gestor completa `fecha_negociacion` | Punitorios calculados en Deal y Ticket |
| Ticket → Judicial | Email de carta documento al inquilino |

---

## NÚMEROS DEL SISTEMA

| Objeto | Cantidad |
|---|---|
| Tickets activos (Incumplimientos) | 863+ |
| Deals activos (Seguimiento de Deuda) | 606 |
| Propiedades creadas custom | 30+ |
| Workflows activos | 8 |
| Emails automatizados | 3 |

---

## LO QUE FALTA (en desarrollo)

- Formulario v2 — lógica condicional por concepto de deuda
- Agente de IA (Breeze) — entrenado, pendiente de activación
- Tableros comerciales — KPIs de cartera, visitas y operaciones
- Módulo de contratos

---

## PROPUESTA SOBRE EL CONSULTOR EXTERNO

Cualquier proceso, metodología o herramienta que proponga el consultor puede implementarse dentro de HubSpot. No hay que elegir entre su expertise y la plataforma — pueden trabajar en conjunto:

- **El consultor:** diseña el proceso y la metodología de cobranza
- **HubSpot:** lo ejecuta, lo automatiza y lo reporta
- **Franco:** implementa técnicamente lo que el consultor defina

Esto evita duplicar herramientas, mantiene todo centralizado y aprovecha la inversión ya hecha en la plataforma.
