# Módulo de Gestión de Visitas Comerciales
## Informe Ejecutivo — Implementación en HubSpot CRM

**Organización:** FINAER  
**Área:** Comercial / CRM  
**Fecha:** Abril 2026  
**Estado del proyecto:** Implementado y operativo ✅

---

## Resumen Ejecutivo

Se implementó un módulo completo de registro y seguimiento de visitas comerciales dentro de HubSpot CRM, resolviendo una necesidad operativa crítica del equipo de oficiales de cuenta: documentar cada visita a inmobiliarias de forma estructurada, adaptada al estado comercial de cada cliente.

El proyecto eliminó la necesidad de herramientas externas para el registro de visitas, automatizó la creación de registros en el CRM y habilitó a 20 ejecutivos de campo a operar desde el celular sin necesidad de licencias pagas adicionales, generando un **ahorro proyectado de USD 4.800 anuales**.

---

## 1. Contexto y Problema a Resolver

### Situación previa

El equipo comercial de FINAER realiza visitas periódicas a inmobiliarias para captación, seguimiento y reactivación de clientes. Antes de esta implementación:

- No existía un registro centralizado y estandarizado de visitas
- La información quedaba dispersa en papel, correos o planillas individuales
- No había visibilidad para la gerencia sobre frecuencia de visitas, resultados ni seguimientos pendientes
- Los ejecutivos no tenían acceso operativo al CRM desde el campo

### Problema adicional: formularios genéricos no sirven

Una inmobiliaria en estado "activa" requiere información completamente diferente a una en estado "perdida" o "nueva". Un formulario único generaría campos irrelevantes para cada caso, degradando la calidad del dato y la experiencia del usuario.

---

## 2. Solución Implementada

### Enfoque: 100% nativo en HubSpot

La solución fue diseñada íntegramente dentro de HubSpot, sin integraciones externas ni desarrollos complejos, priorizando mantenibilidad y escalabilidad por el propio equipo.

### Arquitectura del módulo

```
Ejecutivo comercial
       │
       ▼
Ficha de empresa (celular o PC)
       │
       ▼ (link dinámico según estado de la empresa)
Formulario específico por estado
  ├── NUEVA      → formulario de prospección
  ├── ACTIVA     → formulario de seguimiento
  ├── PASIVA     → formulario de reactivación
  ├── INACTIVA   → formulario de evaluación
  └── PERDIDA    → formulario de análisis de baja
       │
       ▼ (envío automático)
Deal creado en pipeline "Visitas Comerciales"
       │
       ▼ (automatización)
Deal asociado a la empresa correspondiente
```

### Componentes clave

| Componente | Descripción | Tipo |
|-----------|-------------|------|
| Propiedad `estado_de_actividad` | Clasifica cada inmobiliaria en 5 estados | Propiedad empresa (existente) |
| Propiedad `visita_formulario_url` | Almacena el link del formulario correcto | Propiedad empresa (URL) |
| 5 formularios de visita | Uno por estado, con campos específicos | Formularios HubSpot |
| Pipeline "Visitas Comerciales" | Ciclo de vida de cada visita | Pipeline de negocios |
| Workflow A | Asigna URL correcta según estado | Automatización |
| Workflow B | Crea Deal al enviar formulario | Automatización |
| Workflow C | Vincula Deal con la empresa | Automatización |

---

## 3. Formularios por Estado Comercial

Cada formulario está diseñado para capturar exactamente la información relevante según el estado de la inmobiliaria, evitando campos vacíos o irrelevantes.

### Campos comunes a todos los formularios

| Campo | Descripción |
|-------|-------------|
| Estado de cartera | Identifica el estado (se completa automáticamente) |
| Nombre de empresa | Empresa visitada |
| Origen del contacto | Cómo se originó el vínculo con la inmobiliaria |
| Volumen potencial | Estimación de operaciones posibles |
| Exclusividad | Si la inmobiliaria trabaja en exclusiva o no |
| Resultado de gestión | Resultado concreto de la visita |
| Próxima acción | Qué sigue después de esta visita |
| Nivel de interés | Alto / Medio / Bajo / Nulo |

### Campos específicos por estado

**NUEVA — Prospección inicial**
- Condiciones comerciales requeridas para operar
- Presentación nueva realizada (Sí/No)
- Conocimiento del servicio

**ACTIVA — Seguimiento de cuenta**
- Continuidad de trabajo (Sí/No)
- Nivel de satisfacción con observaciones
- Alerta de competencia nueva detectada
- Nuevas condiciones solicitadas

**PASIVA — Reactivación**
- Motivos de inactividad
- Propuesta de reactivación presentada
- Próximo paso hacia la reactivación

**INACTIVA — Evaluación**
- Vigencia del cliente
- Potencial comercial actual
- Motivo de falta de operación
- Decisión: reactivar / mantener en observación / cerrar

**PERDIDA — Análisis de baja**
- Motivo de pérdida
- Condiciones comerciales de la competencia
- Empresa competidora que captó al cliente
- Condiciones para volver

---

## 4. Automatizaciones Implementadas

### Workflow A — Asignación de Formulario Dinámico
**Objeto:** Empresas  
**Trigger:** Cambio en `estado_de_actividad`  
**Acción:** Actualiza `visita_formulario_url` con el link del formulario correspondiente al nuevo estado

El ejecutivo siempre accede al formulario correcto directamente desde la ficha de la empresa, sin necesidad de buscar o seleccionar manualmente.

---

### Workflow B — Creación de Negocio desde Formulario
**Objeto:** Contactos  
**Trigger:** Envío de cualquiera de los 5 formularios de visita  
**Acción:** Crea automáticamente un Deal en el pipeline "Visitas Comerciales" con:
- Nombre del negocio: `Visita - [Empresa] ([Estado])`
- Etapa inicial: "Visita registrada"
- Propietario del negocio: ejecutivo que registró la visita
- Todos los campos completados en el formulario copiados al Deal

---

### Workflow C — Asociación Deal-Empresa
**Objeto:** Negocios  
**Trigger:** Deal creado en pipeline "Visitas Comerciales" con ID de empresa conocido  
**Acción:** Vincula automáticamente el Deal con la empresa (inmobiliaria) correspondiente, permitiendo ver el historial de visitas directamente desde la ficha de la empresa

---

## 5. Pipeline de Visitas Comerciales

Cada visita registrada se convierte en un negocio que fluye por el siguiente pipeline:

| Etapa | Descripción |
|-------|-------------|
| **Visita registrada** | Entrada inicial, formulario enviado |
| **Requiere seguimiento** | La visita generó una acción pendiente |
| **Reactivada** | Empresa pasiva/inactiva retomó actividad |
| **En observación** | Empresa con alertas o riesgo detectado |
| **Cerrada definitivamente** | Empresa descartada del portafolio activo |

Este pipeline permite a la gerencia visualizar el estado de cada vínculo comercial y detectar inmobiliarias sin seguimiento activo.

---

## 6. Experiencia del Ejecutivo Comercial

### Flujo operativo desde el celular

1. Abrir HubSpot → Empresa visitada
2. Ver el campo **"Registrar Visita Comercial"** (link directo al formulario correcto)
3. Tocar el link → se abre el formulario específico para ese estado
4. Completar los campos de la visita
5. Enviar → el sistema crea automáticamente el registro

**Tiempo estimado de registro:** 2 a 5 minutos por visita  
**Dispositivos:** Celular (mobile-first) y computadora  
**Requisito técnico:** Ninguno — solo acceso a internet

### Sin licencias adicionales

Los ejecutivos de campo necesitan únicamente:
- Consultar la ficha de la empresa para obtener el link del formulario
- Acceder al formulario externo de HubSpot (gratuito, sin login)

Esto se logra con licencias de **usuario gratuito** (CRM Free), sin necesidad de licencias pagas de Sales Hub o Marketing Hub para el equipo de campo.

---

## 7. Análisis de Ahorro y ROI

### Contexto

El equipo comercial cuenta con **20 oficiales de cuenta** que realizan visitas de campo. Sin esta implementación, para darles acceso operativo a HubSpot y registrar visitas se necesitaría otorgarles licencias de usuario pago.

### Cálculo de ahorro

| Concepto | Detalle | Costo |
|----------|---------|-------|
| Licencia Sales Hub Starter por usuario | USD 20/mes/usuario | — |
| Usuarios de campo requeridos | 20 oficiales de cuenta | — |
| Costo mensual sin solución | 20 × USD 20 | USD 400/mes |
| **Costo anual sin solución** | 12 × USD 400 | **USD 4.800/año** |
| Costo con solución implementada | Licencias gratuitas (CRM Free) | **USD 0/año** |
| **Ahorro anual generado** | | **USD 4.800/año** |

### Notas sobre el cálculo
- Se toma como referencia el precio de Sales Hub Starter (plan base con acceso completo para usuarios de campo)
- Los usuarios con licencia gratuita pueden: ver fichas de empresa, acceder a links de formularios, y registrar visitas mediante formularios externos
- La solución fue implementada con recursos internos, sin costo de licencias adicionales de software

---

## 8. Decisiones Clave del Diseño

### Por qué formularios separados y no uno dinámico

**Opción descartada:** Card de UI Extension con formulario dinámico en React  
**Problema:** Requería deployment de código, conocimiento técnico para mantenimiento, y dependía de funciones serverless con limitaciones de entorno

**Decisión tomada:** 5 formularios nativos de HubSpot + automatización para asignar el correcto  
**Beneficio:** Mantenible por cualquier persona del equipo sin código, escalable, robusto

---

### Por qué el link del formulario vive en la ficha de la empresa

Centralizar el punto de acceso en la ficha de la empresa permite:
- Que el ejecutivo encuentre el formulario correcto sin errores
- Que el link se actualice automáticamente si cambia el estado de la empresa
- Que la implementación sea completamente móvil sin apps adicionales

---

### Por qué se crean Deals y no un objeto personalizado

Los negocios (Deals) en HubSpot tienen:
- Pipeline nativo con etapas visuales
- Reportes y dashboards disponibles de forma estándar
- Asociaciones nativas con empresas y contactos
- Filtros y vistas configurables sin desarrollo

Usar un objeto personalizado habría requerido más configuración sin beneficios adicionales para este caso de uso.

---

## 9. Capacidades de Reporte y Análisis

Con el módulo operativo, la gerencia puede acceder a reportes como:

### Actividad comercial
- Visitas realizadas por ejecutivo (período seleccionable)
- Empresas sin visita en los últimos 30/60/90 días
- Frecuencia de visitas por zona o segmento

### Inteligencia comercial
- Distribución de inmobiliarias por estado (nueva / activa / pasiva / inactiva / perdida)
- Nivel de interés promedio por ejecutivo o zona
- Competencia más frecuentemente detectada en el campo
- Inmobiliarias con alertas de desvío negativo activas
- Tasa de reactivación de cuentas pasivas e inactivas

### Seguimiento de pipeline
- Deals en etapa "Requiere seguimiento" sin avance
- Evolución del pipeline por mes
- Deals cerrados definitivamente vs. reactivados

---

## 10. Estado Actual y Próximos Pasos

### Implementado y operativo ✅

| Componente | Estado |
|-----------|--------|
| 5 formularios de visita (por estado) | ✅ Creados y probados |
| Propiedad `visita_formulario_url` (tipo URL) | ✅ Activa en empresas |
| Pipeline "Visitas Comerciales" | ✅ Activo con etapas definidas |
| Workflow A — Asignación de formulario | ✅ Activo (ID: 4092075245) |
| Workflow B — Creación de Deal | ✅ Activo (ID: 4092196041) |
| Workflow C — Asociación con empresa | ✅ Activo (ID: 4092141776) |
| Test end-to-end | ✅ Deals creados y asociados correctamente |

### Pendiente de resolución

| Tarea | Bloqueo | Acción requerida |
|-------|---------|-----------------|
| Propietario del Deal (ejecutivo que visitó) | Pendiente de asignación de dueños de empresa | Decisión de gerencia sobre asignación de empresas a ejecutivos |
| Test completo con propietario asignado | Depende del punto anterior | — |

### Próxima evolución sugerida

1. **Asignación de empresas a ejecutivos:** Completar la asignación de `hubspot_owner_id` en empresas para que los Deals generados hereden automáticamente el ejecutivo responsable
2. **Dashboard ejecutivo:** Armar un dashboard en HubSpot con los reportes definidos en la sección 9
3. **Alertas automáticas:** Configurar notificaciones cuando se detecte nueva competencia o desvío negativo en una empresa activa
4. **Segmentación por zona:** Incorporar propiedad de zona geográfica para reportes territoriales

---

## 11. Impacto Organizacional

### Para los ejecutivos comerciales
- Proceso de registro estandarizado, rápido y accesible desde el celular
- No requiere capacitación técnica ni adopción de nuevas herramientas
- El formulario correcto siempre disponible desde la ficha de la empresa

### Para la gerencia comercial
- Visibilidad completa de la actividad de campo en tiempo real
- Información estructurada y comparable entre ejecutivos
- Base de datos de inteligencia competitiva consolidada
- Seguimiento de cuentas en riesgo o en proceso de reactivación

### Para el área de CRM / Operaciones
- Solución 100% nativa, sin dependencias de código externo
- Mantenimiento posible desde la interfaz de HubSpot
- Escalable: agregar un nuevo formulario o campo no requiere desarrollo

---

## Apéndice — Referencia Técnica

### IDs del portal HubSpot (EU1 — 145725856)

| Objeto | Nombre | ID |
|--------|--------|----|
| Pipeline | Visitas Comerciales | `3588863210` |
| Etapa | Visita registrada | `4921967837` |
| Workflow A | Asignar URL de formulario | `4092075245` |
| Workflow B | Crear Deal desde formulario | `4092196041` |
| Workflow C | Asociar Deal con empresa | `4092141776` |

### Formularios de visita

| Estado | Form ID |
|--------|---------|
| Nueva | `87e8826e-d3ee-40b9-8c6f-43c7f7bc79e0` |
| Activa | `d6c9f335-6294-49aa-b45a-d438c0cf3b01` |
| Pasiva | `911cfc9b-d7ed-475e-9996-5a5eff800d8d` |
| Inactiva | `c364bc13-5096-4ebe-94b2-0dc189b4dcc7` |
| Perdida | `5d66904e-89fc-4db1-917c-f0c2e3c70ede` |

---

*Documento elaborado en Abril 2026 — Portal HubSpot EU1*
