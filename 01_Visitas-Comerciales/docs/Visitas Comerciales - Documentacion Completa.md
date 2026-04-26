# Visitas Comerciales — Documentación Completa
**Proyecto:** Gestión de Visitas Comerciales — FINAER  
**Fecha:** Abril 2026  
**Estado:** Propiedades creadas ✅ | Código generado ✅ | Deploy pendiente ⏳

---

## PARTE 1 — PARA USUARIOS DE HUBSPOT
*(Sin conocimiento técnico requerido)*

---

### ¿Qué es este proyecto?

Cuando un oficial de cuenta visita una inmobiliaria, necesita registrar esa visita en HubSpot. El problema es que no todas las inmobiliarias son iguales: una inmobiliaria **nueva** necesita información diferente a una **activa**, una **pasiva** o una **perdida**.

Este proyecto resuelve eso: cuando el ejecutivo abre el formulario de visita, HubSpot detecta automáticamente el estado de la inmobiliaria y muestra solo los campos que corresponden a ese estado. No hay campos de más, no hay confusión.

---

### ¿Cómo funciona para el ejecutivo comercial?

1. El ejecutivo abre HubSpot desde el celular o la computadora
2. Busca la inmobiliaria que visitó
3. Desde el registro de la empresa, hace click en **"Registrar Visita Comercial"**
4. HubSpot lee automáticamente el estado de esa inmobiliaria
5. Aparece el formulario con los campos correctos para ese estado
6. Completa la información y hace click en **"Registrar visita"**
7. Se crea automáticamente un negocio (Deal) vinculado a esa empresa con toda la información

---

### ¿Qué campos ve el ejecutivo según el estado?

#### Campos que aparecen SIEMPRE (base)
| Campo | Qué es |
|-------|--------|
| Fecha de visita | Día en que se realizó la visita |
| Tipo de visita | Primera visita / Seguimiento / Reactivación / Capacitación / Cierre comercial |
| Estado de inmobiliaria | Se completa solo (no lo toca el ejecutivo) |
| Nivel de interés | Alto / Medio / Bajo / Nulo |
| Competencia detectada | Qué empresas competidoras están presentes |
| Detalle de la visita | Campo de texto libre para notas |
| Próxima acción comercial | Qué sigue después de esta visita |
| Fecha próximo contacto presencial | Cuándo es la próxima visita |
| Fecha próximo contacto otros canales | Cuándo es el próximo contacto telefónico/mail (opcional) |

#### Checklist adicional — Inmobiliaria NUEVA
| Campo | Opciones |
|-------|----------|
| Origen del contacto | Referido / Prospección / Web / Evento / Espontáneo / Otro |
| Condiciones para operar | Cobertura / Participación / Costo de fianza / Prioriza propietario / Prioriza inquilino |
| Competidores actuales | GarantíaYa / Garantor / Seguro de caución / Título de propiedad / Otro |

#### Checklist adicional — Inmobiliaria ACTIVA
| Campo | Opciones |
|-------|----------|
| Continuidad de trabajo | Sí / No |
| Nivel de satisfacción | 100% sin observaciones / Con observaciones |
| Detalle de observaciones | Área / Atención OC / Comisión / Precio / Rubros / Otros |
| Conocimiento del servicio | Sí / Parcialmente / No |
| Condición especial (alerta) | Competencia nueva / Mejor posicionada / Pérdida parcial / Pérdida total / Menos inmuebles |
| Nueva competencia detectada | Sí / No (activa alerta automática a gerencia) |
| Empresa competidora nueva | Texto libre |
| Resultado de la gestión | Relación consolidada / Riesgo detectado / Acción correctiva en curso |

#### Checklist adicional — Inmobiliaria PASIVA
| Campo | Opciones |
|-------|----------|
| Motivo de inactividad | Falta propiedades / Precio / Comisión / Tiempos OC / Gestión área / Dejó el rubro / Cierre definitivo |
| Propuesta de reactivación presentada | Sí / No |
| Detalle de la propuesta | Texto libre |
| Competencia actual | Texto libre |
| Fecha de reactivación | Fecha |

#### Checklist adicional — Inmobiliaria INACTIVA
| Campo | Opciones |
|-------|----------|
| Vigencia del cliente | Sí / No |
| Interés actual en el servicio | Alto / Medio / Bajo / Nulo |
| Potencial comercial | Alto / Medio / Bajo |
| Motivo de falta de operación | Solo venta / Título propietario / Competencia / Otro |
| Próximo paso o cierre | Intentar reactivación / Mantener en observación / Cerrar definitivamente |
| Fecha de seguimiento | Fecha |
| Actualización datos de contacto | Sí / No |

#### Checklist adicional — Inmobiliaria PERDIDA
| Campo | Opciones |
|-------|----------|
| Motivo de pérdida | Precio / Participación / Competencia / Problemas de servicio / Tiempos OC / Problemas área / Dejó alquileres / Cierre definitivo / Otro |
| Detalle del motivo de pérdida | Texto libre |
| Empresa competidora captadora | GarantíaYa / Garantor / Seguro de caución / Título de propiedad / Otro |
| Condiciones comerciales competencia | Precio / Participación / Tiempos y atención / Beneficios diferenciales |
| Condiciones para volver | Texto libre |
| Detalle final y conclusiones | Texto libre |
| Fecha reactivación presencial | Fecha |
| Fecha reactivación otros canales | Fecha |

---

### ¿Dónde viven estas visitas en HubSpot?

Cada visita queda registrada como un **Negocio (Deal)** en el pipeline **"Visitas Comerciales"**, asociado a la empresa (inmobiliaria) correspondiente.

**Etapas del pipeline:**
1. Visita registrada
2. Requiere seguimiento
3. Reactivada
4. En observación
5. Cerrada definitivamente

Esto permite filtrar, buscar y reportar todas las visitas por ejecutivo, por estado de inmobiliaria, por período, etc.

---

### ¿Qué reportes se pueden generar?

Con la información cargada en cada visita se pueden armar dashboards como:
- Visitas por ejecutivo comercial (cantidad y frecuencia)
- Inmobiliarias sin visitas en los últimos X días
- Distribución por estado (nueva / activa / pasiva / inactiva / perdida)
- Nivel de interés promedio por zona o ejecutivo
- Competencia más frecuente detectada
- Inmobiliarias con alerta de desvío negativo
- Evolución de reactivaciones

---

---

## PARTE 2 — PARA DESARROLLADORES
*(Implementación técnica)*

---

### Stack y herramientas

| Herramienta | Versión | Uso |
|-------------|---------|-----|
| Node.js | v25.9.0 | Runtime para CLI y funciones serverless |
| HubSpot CLI | v8.4.0 | Deploy del proyecto al portal |
| HubSpot UI Extensions | platformVersion 2023.2 | Formulario dinámico embebido en CRM |
| HubSpot Private App | pat-eu1-... | Autenticación API REST |
| axios | ^1.6.0 | HTTP client en funciones serverless |

---

### Estructura del proyecto

```
/c/dev/visitas-comerciales/
├── hsproject.json                          # Config del proyecto HubSpot
└── src/
    └── app/
        ├── app.json                        # Config de la app (scopes, nombre)
        ├── package.json                    # Dependencias serverless (axios)
        ├── extensions/
        │   ├── VisitaComercial.jsx         # Componente React — formulario dinámico
        │   └── VisitaComercial.json        # Config del card (objeto Companies)
        └── functions/
            ├── functions.json              # Config de funciones serverless
            ├── getCompanyState.js          # Lee estado_de_actividad de la empresa
            └── createVisitaDeal.js         # Crea el Deal y lo asocia a la empresa
```

---

### Archivos clave — Descripción detallada

#### `hsproject.json`
Define el proyecto HubSpot. El campo `platformVersion` debe coincidir con la versión soportada por el portal.

```json
{
  "name": "visitas-comerciales",
  "srcDir": "src",
  "platformVersion": "2023.2"
}
```

#### `src/app/app.json`
Configura la app: nombre, scopes de API necesarios, y qué extensiones incluye.

**Scopes requeridos:**
- `crm.objects.deals.read` — leer deals existentes
- `crm.objects.deals.write` — crear el deal de visita
- `crm.objects.companies.read` — leer el estado de la empresa

#### `src/app/extensions/VisitaComercial.json`
Indica que el card aparece en el objeto `companies` (ficha de la empresa en HubSpot).

#### `src/app/extensions/VisitaComercial.jsx`
Componente React principal. Lógica:

1. Al montar, llama a `getCompanyState` pasando el `objectId` de la empresa activa
2. Guarda el estado en `estadoInmobiliaria`
3. Renderiza los campos base siempre
4. Si hay estado, busca la config en `CHECKLIST_CONFIG[estado]` y renderiza los campos condicionales
5. Al guardar, llama a `createVisitaDeal` con todos los valores del formulario
6. Muestra alerta de éxito y refresca las propiedades del objeto

**Campos multi-select** se serializan con `;` para compatibilidad con HubSpot (ej: `"garantiaya;garantor"`).

#### `src/app/functions/getCompanyState.js`
Función serverless que recibe `companyId` y devuelve el valor de `estado_de_actividad`.

```
GET /crm/v3/objects/companies/{id}?properties=estado_de_actividad
→ { estado: "activa" | "pasiva" | "inactiva" | "nueva" | "perdida" | null }
```

#### `src/app/functions/createVisitaDeal.js`
Función serverless que:
1. Construye el objeto `properties` con todos los campos del formulario
2. Convierte fechas de timestamp JS a milisegundos (formato HubSpot)
3. Envía `POST /crm/v3/objects/deals` para crear el Deal
4. Asocia el Deal a la empresa con `PUT /crm/v3/associations/deals/companies/batch/create`

**Pipeline y etapa hardcodeados:**
- Pipeline: `3588863210` (Visitas Comerciales)
- Etapa inicial: `4921967837` (Visita registrada)

#### `src/app/functions/functions.json`
Define el runtime (Node 18), los endpoints disponibles y el secret `PRIVATE_APP_ACCESS_TOKEN`.

**Importante:** El token de la Private App se carga como variable de entorno secreta, no como hardcode en el código.

---

### Variable de entorno requerida

Antes del deploy, configurar el secret en el portal:

```bash
hs secrets add PRIVATE_APP_ACCESS_TOKEN
# Ingresar: pat-eu1-87f3fc69-9f28-409b-9046-db09ef4e6d31
```

---

### Cómo hacer el deploy

```bash
# 1. Agregar PATH (solo necesario en esta terminal de Claude Code)
export PATH="$PATH:/c/Program Files/nodejs:/c/Users/Usuario/AppData/Roaming/npm"

# 2. Verificar que la CLI está autenticada
hs accounts list

# 3. Agregar el secret del token
hs secrets add PRIVATE_APP_ACCESS_TOKEN

# 4. Deployar
cd /c/dev/visitas-comerciales
hs project upload
```

El deploy sube el código al portal de HubSpot. Una vez completado, el card "Registrar Visita Comercial" aparece disponible en la ficha de empresas.

---

### Propiedades de Deal creadas (grupo: `visitas_comerciales`)

#### Base (todas las visitas)
| Nombre API | Label | Tipo |
|------------|-------|------|
| `fecha_de_visita` | Fecha de visita | date |
| `tipo_de_visita` | Tipo de visita | enumeration (select) |
| `estado_de_inmobiliaria` | Estado de inmobiliaria | enumeration (select) |
| `nivel_de_interes` | Nivel de interés | enumeration (select) |
| `competencia_detectada` | Competencia detectada | enumeration (checkbox) |
| `detalle_de_la_visita` | Detalle de la visita | string (textarea) |
| `proxima_accion_comercial` | Próxima acción comercial | enumeration (select) |
| `fecha_proximo_contacto_presencial` | Fecha próximo contacto presencial | date |
| `fecha_proximo_contacto_otros_canales` | Fecha próximo contacto otros canales | date |

#### Checklist Nueva
| Nombre API | Label | Tipo |
|------------|-------|------|
| `origen_del_contacto` | Origen del contacto | enumeration (select) |
| `condiciones_para_operar` | Condiciones para operar | enumeration (checkbox) |
| `competidores_actuales` | Competidores actuales | enumeration (checkbox) |

*(Propiedades existentes reutilizadas: `volumen_potencial_de_operaciones`, `cantidad_de_propiedades_en_administracion`, `tipo_de_exclusividad`)*

#### Checklist Activa
| Nombre API | Label | Tipo |
|------------|-------|------|
| `continuidad_de_trabajo` | Continuidad de trabajo | enumeration (select) |
| `nivel_de_satisfaccion` | Nivel de satisfacción | enumeration (select) |
| `detalle_de_observaciones` | Detalle de observaciones | enumeration (checkbox) |
| `conocimiento_del_servicio` | Conocimiento del servicio | enumeration (select) |
| `condicion_especial` | Condición especial (alerta desvío) | enumeration (checkbox) |
| `nueva_competencia_detectada` | Nueva competencia detectada | enumeration (select) |
| `empresa_competidora_nueva` | Empresa competidora nueva | string (text) |
| `resultado_de_la_gestion` | Resultado de la gestión | enumeration (select) |

#### Checklist Pasiva
| Nombre API | Label | Tipo |
|------------|-------|------|
| `motivo_de_inactividad` | Motivo de inactividad | enumeration (checkbox) |
| `propuesta_de_reactivacion_presentada` | Propuesta de reactivación presentada | enumeration (select) |
| `detalle_de_la_propuesta` | Detalle de la propuesta | string (textarea) |
| `competencia_actual` | Competencia actual | string (textarea) |
| `fecha_de_reactivacion` | Fecha de reactivación | date |

#### Checklist Inactiva
*(Todas las propiedades ya existían en el portal)*
`vigencia_del_cliente`, `interes_actual_en_el_servicio`, `potencial_comercial`, `motivo_de_falta_de_operacion`, `proximo_paso`, `fecha_de_seguimiento`, `datos_de_contacto_actualizados`

#### Checklist Perdida
| Nombre API | Label | Tipo |
|------------|-------|------|
| `motivo_de_perdida` | Motivo de pérdida | enumeration (select) |
| `detalle_del_motivo_de_perdida` | Detalle del motivo de pérdida | string (textarea) |
| `empresa_competidora_captadora` | Empresa competidora captadora | enumeration (select) |
| `condiciones_comerciales_competencia` | Condiciones comerciales competencia | enumeration (checkbox) |
| `condiciones_para_volver` | Condiciones para volver | string (textarea) |
| `detalle_final_y_conclusiones` | Detalle final y conclusiones | string (textarea) |
| `fecha_reactivacion_presencial` | Fecha reactivación presencial | date |
| `fecha_reactivacion_otros_canales` | Fecha reactivación otros canales | date |

---

### Pendientes para completar el módulo

| Tarea | Responsable | Notas |
|-------|-------------|-------|
| Renombrar etapas `?` y `?2` del pipeline Visitas Comerciales | Claude Code (API) | IDs: 4921967842, 4921967843 |
| Agregar secret `PRIVATE_APP_ACCESS_TOKEN` en HubSpot | Franco (UI o CLI) | Necesario antes del deploy |
| Deploy `hs project upload` | Claude Code (CLI) | Desde `/c/dev/visitas-comerciales` |
| Workflow: copiar `estado_de_actividad` de empresa al Deal al crearlo | Claude Code (API) | Garantiza que el formulario siempre tenga el estado correcto |
| Activar el card en la vista de empresas en HubSpot | Franco (UI) | Settings → Objects → Companies → Record customization |

---

### IDs de referencia del portal (145725856)

| Objeto | Nombre | ID |
|--------|--------|-----|
| Pipeline deals | Visitas Comerciales | `3588863210` |
| Etapa | Visita registrada | `4921967837` |
| Etapa (renombrar) | ? | `4921967842` |
| Etapa (renombrar) | ?2 | `4921967843` |
| Pipeline deals | Incumplimientos - Seguimiento de deuda | `3403406575` |
| Pipeline tickets | Incumplimientos | `3353793749` |
