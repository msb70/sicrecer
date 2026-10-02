# Base de datos SiCrecer (Neon Postgres)

Proyecto Neon: `Sicrecer` (`lucky-glitter-58791533`, rama `production`).

## Migraciones

Las migraciones viven en `db/migrations/` y se aplican en orden. Cada archivo ya está
aplicado en la rama `production`; este directorio es la fuente de verdad versionada del esquema.

| Archivo | Contenido |
|---|---|
| `0001_esquema_inicial.sql` | 16 tablas del dominio, RLS y permisos base |
| `0002_seed_inicial.sql` | Datos iniciales (migrados desde los mocks del frontend) |
| `0003_transaccional_rbac.sql` | Cronograma de cuotas real, `audit_log` inmutable con triggers, RBAC en RLS por rol/organización, funciones `generar_cronograma`, `aplicar_pago` (idempotente) y `recalcular_mora` |
| `0005_requisitos_adjuntos.sql` | `requisitos.tipo` (archivo / documento_identidad / selfie), tabla `solicitante_requisitos` (adjunto por requisito, imagen o PDF ≤ 1,2 MB, RLS propia) y validación de solicitud externa que exige adjunto para los obligatorios de tipo archivo |
| `0006_reglas_credito.sql` | Reglas de crédito acordadas con SiCrecer (2026-09-28): configuración de producto (servicios de desarrollo empresarial, mora, gastos administrativos, días de gracia, plazos permitidos), `desembolsar_solicitud`, cronograma con primera cuota a un período del desembolso, `cargos_atraso`, `aplicar_pago` (gastos → mora → interés → capital; excedente = anticipo con recálculo de cuota), `simular_pago`, `estado_cuenta`, `recalcular_mora` |
| `0007_config_y_agenda.sql` | `organizaciones.configuracion` (jsonb: datos generales, notificaciones, regional), `visitas.facilitador_id`, `prospectos.lat/lng` |
| `0008_plazo_hasta_maximo.sql` | Plazo libre: el solicitante elige de 1 hasta `plazo_max` cuotas (`fn_max_cuotas`, `fn_plazo_valido`); `plazos_permitidos` queda obsoleto |
| `0009_ubicaciones.sql` | `pais/ciudad/localidad/direccion` en prospectos y clientes, `localidad` en solicitantes, `productos_credito.cobertura`, `fn_cobertura_incluye`, triggers `trg_validar_cobertura` (solicitudes) y `trg_copiar_ubicacion` (solicitante → cliente) |
| `0010_prospecto_desde_portal.sql` | Cada registro del portal crea/actualiza su prospecto (`prospectos.solicitante_id`, canal `portal`); pasa a `convertido` al volverse cliente |
| `0011_bloqueo_conversion_portal.sql` | Impide convertir a mano un prospecto del portal (solo al aprobarse su solicitud en comité) |
| `0012_comite_plazo_y_saldo_convenio.sql` | Comité valida plazo con `fn_plazo_valido` (1..máximo); desembolso exige convenio activo con saldo y descuenta el monto del crédito de `saldo_disponible` |
| `0013_cartera_por_zona_y_agenda.sql` | Tabla `zonas` (un facilitador por zona, cobertura por ciudad/localidad); `clientes.zona_id`/`prospectos.zona_id` y `clientes.actividad_economica_id`; el facilitador del cliente sale de su zona (triggers `trg_asignar_zona`, `trg_propagar_zona`); RLS por cartera (el facilitador solo ve clientes, créditos, cuotas, pagos, cobranzas, solicitudes, solicitantes, prospectos y visitas de sus zonas; admin/coordinador/auditor/comité ven todo); guarda en `estado_cuenta` y en cobranzas; `fn_scoring_cliente` (scoring provisional 0–1000 y preaprobación); vistas `v_cartera`, `v_cola_cobranza`, `v_renovacion`, `v_solicitudes_pendientes` |
| `0014_scoring_fem.sql` | Scoring FEM (100 pts: capacidad 50 = cobertura 30 + estabilidad 20, experiencia 30, voluntad 20 = veracidad 12 + compromisos 8; semáforo verde/ámbar/naranja/rojo; cuota ≤ 40 % del flujo libre). Tabla `evaluaciones` (visita del asesor), `solicitudes.semaforo/scoring/monto_sugerido`, `fn_scoring_fem`, `fn_scoring_fem_renovacion` (alerta T-30, propuesta hasta 1,5×), `fn_recalcular_scoring` y triggers; `v_renovacion` y `v_solicitudes_pendientes` con el scoring FEM |
| `0015_roles_permisos_y_serie.sql` | Roles configurables: `modulos` (pantallas), `roles` (con perfil de datos base), `rol_permisos` (ver / editar / borrar por módulo), `usuarios.rol_id`; `fn_permiso_actual(modulo, accion)`; la RLS de catálogos y tablas operativas exige el permiso (y el alcance de cartera del perfil); `aplicar_pago`, `desembolsar_solicitud`, `enviar_a_comite` y el voto del comité validan permiso; roles del sistema protegidos y el Administrador no pierde Usuarios/Roles. Vista `v_serie_mensual` (12 meses × crédito: saldo, mora, esperado, recaudado, desembolsado) para el dashboard |
| `0016_requisitos_monto_texto.sql` | Requisitos de tipo `monto` y `texto` además de `archivo`: `solicitante_requisitos.valor_numero/valor_texto` (archivo opcional; cada fila trae archivo, monto o texto), `solicitudes.respuestas_requisitos` (copia congelada de los montos/textos al enviar) y `fn_validar_solicitud_externa` exige el dato según el tipo |
| `0004_portal_solicitantes.sql` | Portal de autoservicio: `solicitantes` + fotos (`solicitante_documentos`, bytea), productos con `paises`/`publico`, `comites` (uno activo por producto) + `comite_miembros` + `comite_votos`, outbox `notificaciones`, RLS del solicitante (solo lo suyo), trigger de validación de solicitudes externas, funciones `enviar_a_comite` y `votar_solicitud` (mayoría simple; al aprobar convierte solicitante→cliente). Endurece la identidad: exige `emailVerified` en Neon Auth |

## Cómo aplicar en un entorno nuevo

```bash
# con psql y la connection string de Neon
psql "$DATABASE_URL" -f db/migrations/0001_esquema_inicial.sql
psql "$DATABASE_URL" -f db/migrations/0002_seed_inicial.sql
psql "$DATABASE_URL" -f db/migrations/0003_transaccional_rbac.sql
psql "$DATABASE_URL" -f db/migrations/0004_portal_solicitantes.sql
psql "$DATABASE_URL" -f db/migrations/0005_requisitos_adjuntos.sql
psql "$DATABASE_URL" -f db/migrations/0006_reglas_credito.sql
psql "$DATABASE_URL" -f db/migrations/0007_config_y_agenda.sql
psql "$DATABASE_URL" -f db/migrations/0008_plazo_hasta_maximo.sql
psql "$DATABASE_URL" -f db/migrations/0009_ubicaciones.sql
psql "$DATABASE_URL" -f db/migrations/0010_prospecto_desde_portal.sql
psql "$DATABASE_URL" -f db/migrations/0011_bloqueo_conversion_portal.sql
psql "$DATABASE_URL" -f db/migrations/0012_comite_plazo_y_saldo_convenio.sql
psql "$DATABASE_URL" -f db/migrations/0013_cartera_por_zona_y_agenda.sql
psql "$DATABASE_URL" -f db/migrations/0014_scoring_fem.sql
psql "$DATABASE_URL" -f db/migrations/0015_roles_permisos_y_serie.sql
psql "$DATABASE_URL" -f db/migrations/0016_requisitos_monto_texto.sql
```

Tras crear tablas **o columnas** nuevas hay que refrescar la caché de esquema del Data API (Consola → Data API →
"Refresh schema cache", o reaplicar su configuración sin cambios); si no, algunas instancias devuelven `PGRST205`
y `select *` omite las columnas nuevas en silencio (pasó con 0009/0010: la web no veía ciudad, localidad ni `solicitante_id`).
`notify pgrst, 'reload schema'` no basta en Neon.

Requisitos previos: Neon Auth y Data API provisionados en la rama (crean el esquema
`neon_auth`, la función `auth.user_id()` y los roles `authenticated`/`anonymous`).

## Modelo de seguridad

- **Lectura**: cualquier usuario autenticado presente en la whitelist `usuarios`; desde 0013 el
  **facilitador** solo lee la cartera de sus zonas (`fn_mis_zonas`, `fn_mis_clientes`, `fn_mis_creditos`).
  `organizaciones`, `usuarios` y `convenios` además se filtran por organización.
- **Escritura de catálogos** (organizaciones, bancos, requisitos, actividades,
  convenios, productos, usuarios): solo rol `administrador`.
- **Escritura de operación** (prospectos, CRM, clientes, solicitudes, visitas):
  `administrador`, `coordinador`, `facilitador`.
- **Dinero** (`creditos`, `cobranzas`, `pagos`, `cronograma_cuotas`): sin escritura
  directa por API. Solo vía `aplicar_pago()` (SECURITY DEFINER, transaccional,
  idempotente por `clave_idempotencia`).
- **Auditoría**: `audit_log` registra INSERT/UPDATE/DELETE de las tablas de dinero y
  solicitudes/convenios vía trigger; sin políticas de UPDATE/DELETE (inmutable por API).
  Lectura solo `administrador`/`auditor`.

## Reglas de crédito (0006)

- **Producto** (`productos_credito`): `tasa_nominal_anual`, `frecuencia` (mensual/quincenal/semanal → tasa por
  período anual/12, /24, /52), `pct_servicios`, `pct_mora_periodo`, `pct_gastos_admin_periodo`,
  `dias_gracia_mora`, `plazos_permitidos` (vacío = rango `plazo_min`–`plazo_max`), `monto_min`/`monto_max`.
  Todos los productos son de cuota fija (francés). `periodo_gracia_dias` quedó obsoleto.
- **Desembolso** (`desembolsar_solicitud(solicitud, fecha)`, admin/coordinador): crea el crédito con las
  condiciones del producto congeladas; `monto_desembolsado` = monto del crédito (lo que se debe),
  `monto_servicios` = round(monto × pct_servicios), `monto_entregado` = monto − servicios. Primera cuota un
  período después de la fecha de desembolso. Marca la solicitud `desembolsada` y notifica al solicitante.
- **Cargos por atraso** (`cargos_atraso`, `fn_generar_cargos`): por cada cuota con capital vencido, pasados los
  días de gracia, se generan gastos administrativos y mora por **período completo** de atraso
  (ceil(días/30|15|7)) sobre el capital vencido de la cuota. Idempotente (único por cuota/tipo/período).
- **Pagos** (`aplicar_pago`): gastos administrativos → mora → por cuota (vencidas y la corriente) interés →
  capital. El excedente es **anticipo a capital**: se recalcula la cuota fija manteniendo el número de cuotas
  restantes y sus fechas. Un pago mayor al total para cancelar se rechaza. `simular_pago` ejecuta la misma
  lógica y revierte (para previsualizar en la UI).
- **Estado de cuenta** (`estado_cuenta(credito, fecha)`): genera cargos al día y devuelve cronograma, cargos,
  pagos y resumen (total para ponerse al día y para cancelar).
- Montos redondeados al entero (pesos). Condonación de cargos: pendiente (fase posterior).

## Mora

`recalcular_mora()` genera los cargos por atraso del día, marca cuotas vencidas y recalcula `dias_mora`/estado
de los créditos. Debe ejecutarse a diario (además, `aplicar_pago` y `estado_cuenta` generan los cargos al día
del crédito que tocan). Lo ejecuta la Neon Function `moradiaria` (`functions/moradiaria.mjs`) con un
Function Trigger programado una vez al día. Neon no tiene pg_cron habilitado por defecto: programarlo con
un job externo (GitHub Actions, scheduler de Hostinger o tarea programada) que ejecute
`select recalcular_mora();` contra la base.

## Deuda conocida

- `pagos.credito_id` y `visitas.cliente_id` sin FK: los datos heredados de los mocks
  referencian ids inexistentes (`cred-001`, `cli-001`). Limpiar antes de endurecer.
- Las tablas operativas (clientes, créditos, etc.) no tienen `organizacion_id`: el
  aislamiento multi-organización completo requiere agregar esa columna y extender las
  políticas.
- Créditos heredados del seed (cred-01..03) tienen `pct_*` en 0: no generan cargos por atraso.

## Portal de solicitantes (0004)

- Un **solicitante** es un usuario de Neon Auth (Google o email+contraseña con OTP) que NO está en `usuarios`.
  `fn_rol_actual()` devuelve NULL para él, así que ninguna política interna le aplica; solo las políticas
  `sel_propio`/`ins_propio` sobre `solicitantes`, `solicitante_documentos` y `solicitudes`, más lectura de
  catálogos (`productos_credito` con `publico and activo`, `requisitos`, `actividades_economicas`, `organizaciones`).
- **Toda identidad exige `emailVerified = true`** en `neon_auth."user"`. En la consola de Neon (Auth → Email/Password)
  debe estar activado *Verify at sign-up* / *require email verification*.
- Flujo: portal crea `solicitudes` (origen `externo`, estado `enviada`; trigger `fn_validar_solicitud_externa`
  comprueba país, rangos, actividad, requisitos obligatorios y fotos) → facilitador `enviar_a_comite()` →
  miembros `votar_solicitud()` (mayoría simple) → `aprobada` (crea `clientes` y liga `solicitantes.cliente_id`) o `rechazada`.
- **Notificaciones**: las funciones insertan en `notificaciones`; la Neon Function `notificador`
  (`functions/notificador.ts`, trigger programado cada 5 min) las envía con Resend. Variables de la función:
  `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFICADOR_SECRET`. Sin `RESEND_API_KEY` el outbox queda en `pendiente`.
- Fotos: JPEG comprimido en cliente (≤ ~150 KB, lado máx 1024 px), guardado como `bytea` (límite duro 400 KB por fila).
  Con más de ~1.500 solicitantes conviene migrar a Neon Object Storage.

## Datos DEMO (Banco Mundial)

`db/demo/demo_banco_mundial.sql` carga 4 facilitadores con sus zonas (Usme, Ciudad Bolívar, Bosa – Kennedy, Soacha),
2 productos nuevos del convenio, comités, 36 clientes, 43 solicitudes en todas las etapas (con evaluaciones que dan
los cuatro colores del semáforo) y 26 créditos generados con el motor real (al día, mora por tramos, por renovar y
cancelados). Todo lleva prefijo `demo-` o cuelga de un cliente demo. `db/demo/borrar_demo.sql` lo borra y devuelve
el capital al convenio.
