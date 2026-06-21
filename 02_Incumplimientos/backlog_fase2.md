# Backlog Fase 2 — Incumplimientos
**Fecha:** Mayo 2026
**Estado:** Pendiente de análisis e implementación

---

## 1. TEMPLATE DE CARTA DOCUMENTO DESDE HUBSPOT

**Objetivo:** Generar la carta documento directamente desde HubSpot usando los datos ya cargados, eliminando el trabajo manual del área legal.

**Datos disponibles en HubSpot:**
- Nombre y apellido del inquilino (Contacto)
- Domicilio del inquilino
- Código de solicitud / número de expediente
- Fecha firma del contrato
- Domicilio del inmueble
- Montos por concepto (alquiler, expensas, ABL, luz, AYSA)
- Punitorios calculados
- Datos bancarios del propietario (CBU, Alias, banco)
- Firmante: Nahuel Bazillo (fijo)

**Lógica de la carta:**
- Alquiler → desglosado POR MES con su punitorio individual
- Servicios → total acumulado con intereses totales
- Requiere: número de meses adeudados por concepto para el desglose mensual

**Pendiente definir:** cómo manejar el desglose mensual del alquiler (propiedades fijas por mes vs campo de texto libre)

---

## 2. PLAN DE PAGOS Y ERP DE RECUPEROS

**Objetivo:** Permitir al Asesor D2 registrar pagos en cuotas y hacer seguimiento del recupero fraccionado.

**Funcionalidades necesarias:**
- Registrar un pago recibido del inquilino con fecha y monto
- Asociar ese pago a qué mes de deuda corresponde
- Generar automáticamente un plan de cuotas si hay acuerdo
- Calcular el saldo pendiente después de cada pago parcial
- Registrar entradas y salidas de dinero por caso
- Contemplar meses de ocupación sin pago (inquilino que no devuelve el inmueble)

**Escenarios a cubrir:**
- Pago total en un solo desembolso (ya existe)
- Pago en cuotas acordadas
- Pago parcial sin plan formal
- Acuerdo de quita (FINAER acepta menos del total desembolsado)
- Múltiples meses de deuda acumulados

---

## 3. TRIGGER AUTOMÁTICO PARA CARTA DOCUMENTO

**Objetivo:** 10 días después de que FINAER realiza el pago al propietario, el sistema detecta automáticamente si el inquilino no pagó y genera la alerta / envía la carta documento.

**Lógica:**
- Propiedad `estado_pedido_fondos` (Pendiente / Pagado) en el Deal
- Cuando `estado_pedido_fondos` = Pagado y se registra la fecha → arranca el countdown
- A los 10 días (corridos o hábiles — definir) → alerta automática al gestor
- Si carta documento ya está generada → se envía automáticamente
- Si no → el sistema avisa que hay que generarla

**Beneficio:** elimina el seguimiento manual de los 10 días

---

## 4. SEGMENTACIÓN POR LOTES PARA CARTA DOCUMENTO

**Objetivo:** Poder identificar y agrupar en HubSpot todos los casos que requieren carta documento en un período dado, para que el área legal los procese en bloque.

**Funcionalidades:**
- Lista dinámica: "Casos pendientes de carta documento"
- Filtro por fecha de vencimiento del plazo
- Exportación del lote con todos los datos necesarios
- Posibilidad de marcar un lote como "enviado"

---

## 5. DEUDA ACUMULATIVA POR MES

**Objetivo:** Cuando un inquilino acumula múltiples meses de deuda, el sistema debe registrar y diferenciar qué desembolso corresponde a qué mes.

**Complejidades:**
- Pago parcial: FINAER paga mayo pero junio sigue sin pagar
- ¿Se crea un nuevo Deal o se acumula en el mismo?
- ¿Cómo se refleja en el Pedido de Fondos?
- El Pedido debe discriminar "pago por mayo" vs "pago por junio"

---

## 6. ESTADO DEL PEDIDO DE FONDOS

**Objetivo:** Propiedad que indique si el Pedido fue efectivamente pagado por Tesorería.

**Propiedad:** `estado_pedido_fondos` — Pendiente / Pagado
**Impacto en el reporte:** solo descarga casos con estado Pendiente
**Trigger:** cuando se marca Pagado → inicia el countdown de 10 días para carta documento

---

## ESCENARIOS ADICIONALES A CONSIDERAR

- **Quita:** FINAER acepta un monto menor al desembolsado. Afecta `deudor_actual`
- **Vencimiento carta documento:** si pasan los 10 días sin respuesta → alerta automática para pasar a judicial
- **Inquilino que no devuelve el inmueble:** meses de ocupación sin pago que FINAER debe cubrir — requiere tracking separado
