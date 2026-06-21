# Tableros Comerciales — Relevamiento Inicial
**Fecha:** 2026-04-28
**Estado:** En construcción — tableros nativos primero, luego automatizaciones

---

## CONTEXTO

Proyecto creado a partir del hilo interno entre Hernán Blanco, Vanesa Núñez y Diego Giani para definir los KPIs del Tablero Comercial de FINAER.

Repositorio centralizado de todo lo relacionado a métricas y reportes comerciales.

---

## FUENTES DE DATOS EN HUBSPOT

| Fuente | Objeto HubSpot | Qué contiene |
|---|---|---|
| Inmobiliarias | Companies | `estado_de_actividad` (NUEVA/ACTIVA/PASIVA/INACTIVA/PERDIDA) — sincronizado desde admin FINAER |
| Operaciones | Deals — Pipeline de ventas | Etapas que generan ingreso real: **Contrato de fianza firmado**, **Contrato de locación firmado**, **Legajo Completo** |
| Visitas | Deals — Pipeline Visitas Comerciales | Visitas registradas por los ejecutivos de cuenta |
| Snapshot cartera | Deals — Pipeline Métricas de Cartera | Conteo semanal de inmobiliarias por estado (script `snapshot_cartera.js`) |

**Pendiente — Grupos:** Propiedad que viene desde el admin FINAER. El TL del equipo la migra el jueves 30/04/2026. Habilita cruces por grupo en todos los reportes.

---

## KPIs DEFINIDOS

### Fuente: hilo interno (Hernán Blanco / Vanesa Núñez / Diego Giani — abril 2026)

#### Cartera de Inmobiliarias
- Cuántas inmobiliarias hay en cada estado: hoy / cierre semana / cierre mes / cierre Q
- Cuántas cambiaron al estado X: hoy / esta semana / este mes / este Q
- % de crecimiento o caída de inmobiliarias activas mes a mes
- Variación en cantidad: altas, bajas y reactivaciones

#### Operaciones
- Cantidad de operaciones por ejecutivo de cuenta: día / semana / mes / Q
- Cantidad de operaciones por líder comercial: día / semana / mes / Q
- Operaciones totales: día / semana / mes / Q
- Operaciones vs objetivo de plan
- Ingreso de solicitudes por OC y % de conversión a operaciones
- Cruce por Grupos — evolución mensual y por Q (abierto por OC, EDC y LC)

#### Actividad Comercial — Visitas
- Visitas registradas por ejecutivo: día / semana / mes
- Visitas en valores absolutos y % sobre objetivo
- Visitas presenciales vs asesoramiento virtual
- Visitas por grupo
- Visitas por estado de actividad de la inmobiliaria
- Visitas por fecha: vencidas y en fecha
- Alerta de visitas por vencer
- Visitas realizadas vs operaciones generadas (productividad)

#### Productividad
- Productividad por OC / zona / líder (mensual)
- Identificación de cartera activa sin producción
- Detección de desvíos (caída de actividad o de operaciones)

---

## MAPA DE CONSTRUCCIÓN

### Nativos HubSpot — buildables ahora (sin WF ni scripts)

| Reporte | Sección | Datos disponibles |
|---|---|---|
| Inmobiliarias por estado actual | Cartera | `estado_de_actividad` en Companies |
| Operaciones por ejecutivo | Operaciones | Deal owner en Pipeline de ventas |
| Operaciones por etapa / tipo de contrato | Operaciones | Pipeline de ventas |
| Evolución de operaciones por mes | Operaciones | Fecha de cierre en Pipeline de ventas |
| Visitas por ejecutivo | Visitas | Deal owner en Pipeline Visitas Comerciales |
| Visitas por estado de inmobiliaria | Visitas | `estado_de_inmobiliaria` en Deal de visita |
| Visitas por tipo (presencial vs virtual) | Visitas | `tipo_de_visita` en Deal de visita |
| Visitas por nivel de interés | Visitas | `nivel_de_interes` en Deal de visita |
| Alertas: visitas con fecha vencida | Visitas | `fecha_proximo_contacto_presencial` < hoy |

### Requieren desarrollo adicional

| Reporte | Qué falta |
|---|---|
| Evolutivo semana a semana por estado | Script `snapshot_cartera.js` programado (ya existe, falta scheduling) |
| Altas, bajas y reactivaciones | Workflow de tracking de cambios de estado |
| Cambios de estado por período | Workflow de tracking de cambios de estado |
| Cruce por Grupos | Propiedad `grupos` — disponible el 30/04/2026 |
| Operaciones vs objetivo de plan | Metas/objetivos a cargar en HubSpot |
| Visitas por Grupo | Propiedad `grupos` — disponible el 30/04/2026 |

---

## SCRIPTS

| Archivo | Función | Estado |
|---|---|---|
| `snapshot_cartera.js` | Crea un Deal semanal con el conteo de inmobiliarias por estado | ✅ Operativo — falta programar ejecución semanal |

---

## BACKLOG

- [ ] Construir reportes nativos (ver tabla arriba)
- [ ] Armar dashboard en HubSpot con los reportes nativos
- [ ] Agregar propiedad `grupos` a los reportes una vez disponible (30/04)
- [ ] Programar `snapshot_cartera.js` para ejecución automática semanal
- [ ] Workflow: tracking de cambios de estado de inmobiliarias
- [ ] Definir y cargar objetivos de plan para el reporte "operaciones vs objetivo"
