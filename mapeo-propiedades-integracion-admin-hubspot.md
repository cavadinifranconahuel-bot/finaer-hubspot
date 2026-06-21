# Mapeo de Propiedades — Integración ADMIN → HubSpot
**Portal:** 145725856 (EU1)
**Última actualización:** Mayo 2026
**Fuente:** hubspot-mapeo-propiedades.md + INFORME_PROPIEDADES_HUBSPOT_FRANCO.md

---

## COMPANIES (Inmobiliarias) — 27 propiedades

**Trigger de sincronización:** Creación o cambio de `estado_de_actividad` únicamente.
Modificar otros campos (teléfono, dirección, etc.) NO dispara sincronización.

| Campo Finaer | Campo HubSpot | Tipo |
|---|---|---|
| id | id_interno | Texto |
| nombre | name | Texto |
| sitio_web | domain | URL |
| domicilio | address | Texto |
| email | correo | Email |
| telefonos | phone | Teléfono |
| ubicacion | ubicacion | Texto |
| estado_de_aprobacion | estado_de_aprobacion | Opciones |
| estado_de_actividad | estado_de_actividad | Texto |
| categoria | categoria | Texto |
| convenio | convenio | Texto |
| observaciones | observaciones | Texto largo |
| fecha_de_alta | fecha_de_alta | Fecha |
| fecha_ultima_operacion | fecha_ultima_operacion | Fecha |
| oficial_de_cuenta | oficial_de_cuenta | Owner (match por email) |
| oficina_comercial | oficina_comercial | Texto |
| iban | iban | Texto |
| cobra_comisiones | cobra_comisiones | Opciones |
| participacion_de_inmobiliaria | participacion_de_inmobiliaria | Número |
| honorario_de_la_garantia_de_alquiler_vivienda | honorario_de_la_garantia_de_alquiler_vivienda | Número |
| honorario_de_la_garantia_de_alquiler_comercial | honorario_de_la_garantia_de_alquiler_comercial | Número |
| honorario_de_la_garantia_de_alquiler_habitacion | honorario_de_la_garantia_de_alquiler_habitacion | Número |
| periodo_de_pago_de_comisiones | periodo_de_pago_de_comisiones | Texto |
| participacion_1_renovacion | participacion_1_renovacion | Número |
| participacion_2_renovacion | participacion_2_renovacion | Número |
| participacion_3_renovacion | participacion_3_renovacion | Número |
| participacion_4_renovacion | participacion_4_renovacion | Número |

**Campo de búsqueda:** `id_interno`
**Lógica:** Si existe → actualiza | Si no existe → crea nueva

---

## DEALS (Solicitudes de Garantía) — 60 propiedades

**Trigger de sincronización:** Creación o cambio de estado de la solicitud.

**Campo de búsqueda:** `codigo_de_garantia__clonada_`
**Pipeline:** default
**Lógica:** Si existe → actualiza | Si no existe → crea nuevo

### Propiedades Principales

| Campo Finaer | Campo HubSpot | Tipo |
|---|---|---|
| codigo (nro) | codigo_de_garantia__clonada_ | Texto |
| codigo (nro) | codigo_de_solicitud | Texto |
| codigo (nro) | dealname | Texto |
| estado | dealstage | Pipeline Stage |
| tipo_de_contrato | tipo_de_contrato | Opciones (INICIAL, PRORROGA, RENOVACION) |
| convenio | convenio | Texto |
| honorario_original | honorario_original | Número |
| honorario_de_la_garantia | amount | Moneda |
| total_operacion.moneda | deal_currency_code | Código |
| inmobiliaria_id | id_inmobiliaria | Texto |
| codigo_original | codigo_original | Texto |
| oficial_de_cuenta | oficial_de_cuenta | Owner (match por email) |
| oficina_comercial | oficina_comercial | Texto |

### Propiedades de Alquiler

| Campo Finaer | Campo HubSpot | Tipo |
|---|---|---|
| forma_de_alquiler | forma_de_alquiler | Opciones (incluye DUEÑO DIRECTO) |
| alquiler.domicilio_inmueble_codigo_postal | codigo_postal | Texto |
| domicilio_inmueble_calle | domicilio_del_inmueble | Texto |
| tipo_de_alquiler | tipo_de_alquiler | Opciones |
| valor_del_alquiler | monto_del_alquiler | Número |
| gastos_de_la_comunidad | expensas | Número |
| duracion_del_alquiler | duracion_del_alquiler | Número |
| vigencia_de_la_garantia | vigencia_de_la_garantia | Número |

### Propiedades Financieras

| Campo Finaer | Campo HubSpot | Tipo |
|---|---|---|
| cantidad_de_cuotas | cantidad_de_cuotas | Número |
| honorario_de_la_garantia_finaer | honorario_de_la_garantia_finaer | Número |
| total_operacion | monto_total_de_la_operacion | Número |
| coste_variable | coste_variable | Número |
| participacion_inmobiliaria | participacion_inmobiliaria | Número |
| participacion_vendedor_de_inmobiliaria | participacion_vendedor_de_inmobiliaria | Número |

### Fechas

| Campo Finaer | Campo HubSpot | Tipo |
|---|---|---|
| fecha_de_alta | fecha_de_alta | Fecha |
| fecha_aprobacion | fecha_aprobacion | Fecha |
| fecha_firma_fianza | fecha_firma_fianza | Fecha |
| fecha_inicio_contrato_locacion | fecha_inicio_contrato_locacion | Fecha |
| fecha_fin_contrato_locacion | fecha_fin_contrato_locacion | Fecha |
| fecha_control_de_pago | fecha_control_de_pago | Fecha |
| fecha_de_control_de_pago | fecha_de_control_de_pago | Fecha |

### Servicios Adicionales

| Campo Finaer | Campo HubSpot | Tipo |
|---|---|---|
| mediacion_de_cobro | mediacion_de_cobro | Checkbox |
| renta_anticipada | renta_anticipada | Checkbox |
| fecha_contratacion_de_mediacion | fecha_contratacion_de_mediacion | Fecha |
| fecha_contratacion_de_anticipo | fecha_contratacion_de_anticipo | Fecha |
| fecha_inicio_mediacion | fecha_inicio_mediacion | Fecha |
| fecha_fin_mediacion | fecha_fin_mediacion | Fecha |
| fecha_inicio_anticipo | fecha_inicio_anticipo | Fecha |
| fecha_fin_anticipo | fecha_fin_anticipo | Fecha |

### Control

| Campo Finaer | Campo HubSpot | Tipo |
|---|---|---|
| categoria | categoria | Opciones |
| cobertura_maxima | cobertura_maxima | Número |
| contrata_seguro_ | contrata_seguro_ | Checkbox |
| control_de_contrato_de_fianza | control_de_contrato_de_fianza | Opciones |
| control_de_contrato_de_locacion | control_de_contrato_de_locacion | Opciones |
| controlada_por_analisis | controlada_por_analisis | Checkbox |
| en_revision_ | en_revision_ | Checkbox |
| operacion_firmada | operacion_firmada | Opciones |
| solicita_busqueda_de_inmueble_ | solicita_busqueda_de_inmueble_ | Checkbox |

### Configuraciones

| Campo Finaer | Campo HubSpot | Tipo |
|---|---|---|
| modo_de_indexacion | modo_de_indexacion | Opciones |
| moneda_de_alquiler | moneda_de_alquiler | Texto |
| periodos_de_indexacion | periodos_de_indexacion | Opciones |
| mes_del_contrato_en_que_inicia_la_garantia | mes_del_contrato_en_que_inicia_la_garantia | Texto |
| contado | contado | Checkbox |
| nash21 | nash21 | Texto |
| nacionalidad_real___origen | nacionalidad_real___origen | Texto |
| vendedor_inicial | vendedor_inicial | Texto |
| solicitante[0].nombre_completo | solicitante | Texto |

### Asociaciones automáticas del Deal
- Deal ↔ Company (Inmobiliaria) usando `id_inmobiliaria`
- Deal ↔ Contacts (Inquilinos, Propietarios, Avalistas, Solicitante) con tipo de asociación según rol

---

## CONTACTS — 16 propiedades

**Trigger:** Automático al sincronizar la Solicitud (Deal).
**Campo de búsqueda:** `email`
**Lógica:** Si existe → actualiza | Si no existe → crea nuevo
**Validación:** Contactos sin email NO se sincronizan.

Los contactos pueden ser de 4 tipos: Solicitante, Inquilino, Propietario, Avalista.

### Persona Física

| Campo Finaer | Campo HubSpot | Tipo |
|---|---|---|
| nombre | firstname | Texto |
| apellido | lastname | Texto |
| email | email | Email |
| tipo_de_documento | tipo_de_documento | Opciones |
| numero_de_documento | numero_de_documento | Texto |
| cuit | cuit_cuil | Texto |
| codigo_de_area_de_movil + numero_de_movil | phone | Teléfono |
| codigo_de_area_de_movil | codigo_de_area_de_movil | Texto |
| condicion_laboral | tipo_de_empleado__contratacion_ | Opciones |
| es_coinquilino | es_coinquilino | Checkbox |

### Persona Jurídica (Avalista empresa)

| Campo Finaer | Campo HubSpot | Tipo |
|---|---|---|
| email | email | Email |
| razon_social | firstname | Texto |
| razon_social | razon_social | Texto |
| cuit | cuit_cuil | Texto |
| codigo_de_area_de_movil_comercial | codigo_de_area_de_movil | Texto |
| telefono_comercial_codigo + telefono_comercial_numero | phone | Teléfono |

### Tipos de asociación Deal ↔ Contact según rol

| Tipo de Cliente | Tipo de Asociación |
|---|---|
| Propietario | USER_DEFINED |
| Inquilino | USER_DEFINED |
| Avalista | USER_DEFINED |
| Solicitante | USER_DEFINED |

---

## NOTAS TÉCNICAS

### Normalización de valores requerida
| Campo | Valores válidos |
|---|---|
| tipo_de_contrato | INICIAL, PRORROGA, RENOVACION |
| estado_de_actividad | NUEVA, ACTIVA, PASIVA, INACTIVA, PERDIDA |
| estado_de_aprobacion | Pendiente, Aprobada, Rechazada |

### Conversión de fechas
- Entrada (Finaer): `DD/MM/YYYY`
- Salida (HubSpot): milisegundos UTC (epoch × 1000)

### Campos de búsqueda únicos (evitan duplicados)
| Objeto | Campo |
|---|---|
| Company | id_interno |
| Deal | codigo_de_garantia__clonada_ |
| Contact | email |
