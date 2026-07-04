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

## Cómo aplicar en un entorno nuevo

```bash
# con psql y la connection string de Neon
psql "$DATABASE_URL" -f db/migrations/0001_esquema_inicial.sql
psql "$DATABASE_URL" -f db/migrations/0002_seed_inicial.sql
psql "$DATABASE_URL" -f db/migrations/0003_transaccional_rbac.sql
```

Requisitos previos: Neon Auth y Data API provisionados en la rama (crean el esquema
`neon_auth`, la función `auth.user_id()` y los roles `authenticated`/`anonymous`).

## Modelo de seguridad

- **Lectura**: cualquier usuario autenticado presente en la whitelist `usuarios`.
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

## Mora

`recalcular_mora()` marca cuotas vencidas y recalcula `dias_mora`/estado de los créditos.
Debe ejecutarse a diario. Neon no tiene pg_cron habilitado por defecto: programarlo con
un job externo (GitHub Actions, scheduler de Hostinger o tarea programada) que ejecute
`select recalcular_mora();` contra la base.

## Deuda conocida

- `pagos.credito_id` y `visitas.cliente_id` sin FK: los datos heredados de los mocks
  referencian ids inexistentes (`cred-001`, `cli-001`). Limpiar antes de endurecer.
- Las tablas operativas (clientes, créditos, etc.) no tienen `organizacion_id`: el
  aislamiento multi-organización completo requiere agregar esa columna y extender las
  políticas.
- `aplicar_pago` reparte cada abono proporcionalmente entre interés y capital de la
  cuota; no hay tabla de cargos por mora (`late_fees`) todavía.
