# Backlog Formularios Visitas Comerciales — v2
**Fecha:** 2026-05-21
**Fuente:** Reunión con gerencia comercial / líderes de equipo

---

## CAMBIOS GLOBALES (todos los formularios)

- [ ] Agregar TÍTULO a cada formulario (ninguno lo tiene)
- [ ] Agregar campo: ¿Brindó merch? (Sí / No)
- [ ] Agregar campo: Listado de productos del merch — **PENDIENTE: lista de productos**

---

## FORMULARIO NUEVA (87e8826e-d3ee-40b9-8c6f-43c7f7bc79e0)

| Campo | Cambio |
|---|---|
| Origen de contacto | Reemplazar opciones: 1. Oficina Comercial / 2. Evento / 3. Ejecutivo de Cuenta / 4. Referido por Inmobiliaria / 5. Página Web |
| Condiciones para operar | Sacar: "Destaca por cobertura" y "Prioriza Propietario" |
| Volumen potencial | SACAR |
| Administra Propiedad | Cambiar opciones a: Sí / No / Sin información |
| Cantidad de Propiedades en Administración | SACAR |
| Competidores Actuales | Agregar lista de competidores + multiselección + opción "Otros" — **PENDIENTE: lista** |
| Tipo de Exclusividad | SACAR |
| Presentación Realizada | SACAR |
| Fecha de Próximo Contacto | Cambiar a formato FECHA |
| Observaciones / Detalles | AGREGAR (campo nuevo) |

---

## FORMULARIO ACTIVAS (d6c9f335-6294-49aa-b45a-d438c0cf3b01)

| Campo | Cambio |
|---|---|
| Continuidad trabajando con Finaer | BORRAR |
| Nivel de satisfacción | Renombrar a "Nivel de Fidelización" con opciones: Excelente / Bueno / Regular / Bajo |
| Tipo de insatisfacción | Judicial + Incumplimientos + Prejudicial → fusionar en "Legales"; Agregar: Oficina Comercial / Baja Participación / Falta de Apoderado Presencial / Otros |
| Detalle | Mover después del punto 5 (posterior a las 3 preguntas nuevas) |
| *(NUEVO)* ¿Adherido a Newsletter? | AGREGAR |
| *(NUEVO)* ¿Conoce el SAI? | AGREGAR |
| *(NUEVO)* ¿Conoce el plan matrícula? | AGREGAR |
| Alerta desvío negativo — Ingreso competencia nueva | SACAR |
| Alerta desvío negativo — Competencia mejor posicionada | Sumar lista de competidores — **PENDIENTE: lista** |
| Nueva competencia | SACAR |
| Empresas competidoras | SACAR |
| Próxima acción comercial | Renombrar a "Próxima visita" + sacar todas las opciones + agregar campo de fecha |
| Descripción de la acción | SACAR |
| Resultado de gestión | Cambiar "Consolidada" por "Relación afianzada" |

---

## FORMULARIO PASIVAS (911cfc9b-d7ed-475e-9996-5a5eff800d8d)

| Campo | Cambio |
|---|---|
| Motivo de pasividad — Comisión | Renombrar a "Participación baja" |
| Motivo de pasividad — Falta de conocimiento de servicio | SACAR |
| Motivo de pasividad — Tiempos de respuesta | Renombrar a "Conflicto con otra área" |
| Motivo de pasividad — resto de opciones | SACAR (definir cuáles quedan) |
| Propuesta de reactivación | BORRAR |
| Detalle de la propuesta | BORRAR |
| Competencia actual | Agregar todos los competidores — **PENDIENTE: lista** |
| Próximo paso definido | Renombrar a "Plan de acciones" |

---

## FORMULARIO INACTIVAS (c364bc13-5096-4ebe-94b2-0dc189b4dcc7)

| Campo | Cambio |
|---|---|
| Primera pregunta (nombre actual desconocido) | Cambiar a: "¿Tiene inmobiliaria a la calle?" |
| Interés actual en el servicio | Cambiar a: "Interés en la visita" |
| Potencial Comercial | SACAR |
| Motivo de falta de operación — Inconformidad con Finaer | SACAR opción |
| Próximo paso | Renombrar a "Próximas acciones" |
| Próxima visita | AGREGAR (campo de fecha) |

---

## FORMULARIO PERDIDAS (5d66904e-89fc-4db1-917c-f0c2e3c70ede)

| Campo | Cambio |
|---|---|
| Empresa Competidora | Agregar lista de competidores + multiselección — **PENDIENTE: lista** |
| Motivo de pérdida — Problemas de servicio | SACAR + reemplazar (definir por qué) |
| Motivo de pérdida — Cierre Definitivo | SACAR |
| Condiciones comerciales de la competencia | Renombrar a: "¿Por qué elige la competencia? / Motivos de elección" |

---

## PENDIENTES ANTES DE IMPLEMENTAR

1. **Lista de competidores** — aparece en 4 formularios (PERDIDA, NUEVA, ACTIVAS, PASIVAS)
2. **Lista de productos de merch** — para el campo de listado de merch
3. **Motivos de pasividad que quedan** — solo se definió qué sacar/renombrar, falta confirmar las opciones finales
4. **Reemplazo de "Problemas de servicio"** en PERDIDAS — qué opción la reemplaza

---

## BACKLOG POST-OPTIMIZACIÓN

- Dashboard actividad comercial por ejecutivo (visitas por estado, tipo, zona)
- Alertas por fecha de próxima visita vencida
- Reportes: cantidad de visitas, presenciales vs distancia, por ejecutivo
- Resultado de visita → cambio automático de estado en la empresa
