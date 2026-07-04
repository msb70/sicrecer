-- ─────────────────────────────────────────────────────────────
-- 0001 · Esquema inicial SiCrecer (aplicado 2026-07-03)
-- Requiere: Neon Auth + Data API provisionados (roles authenticated/anonymous,
-- función auth.user_id()).
-- ─────────────────────────────────────────────────────────────

create table organizaciones (
  id text primary key,
  nombre text not null,
  pais text not null check (pais in ('CO','VE')),
  logo text
);

-- Whitelist de acceso: solo emails presentes aquí pueden usar la app.
create table usuarios (
  id text primary key,
  nombre text not null,
  email text not null unique,
  rol text not null check (rol in ('administrador','coordinador','facilitador','comite','auditor')),
  zona text,
  organizacion_id text not null references organizaciones(id),
  primer_acceso boolean not null default false,
  auth_user_id text unique
);

create table convenios (
  id text primary key,
  cooperante text not null,
  monto_total numeric not null,
  saldo_disponible numeric not null,
  moneda text not null check (moneda in ('COP','UVC')),
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null check (estado in ('activo','cerrado','suspendido')),
  pais text not null check (pais in ('CO','VE')),
  organizacion_id text not null references organizaciones(id)
);

create table bancos (
  id text primary key,
  nombre text not null,
  activo boolean not null default true
);

create table requisitos (
  id text primary key,
  nombre text not null,
  descripcion text,
  obligatorio boolean not null default false
);

create table actividades_economicas (
  id text primary key,
  nombre text not null,
  descripcion text,
  sector text
);

create table productos_credito (
  id text primary key,
  convenio_id text not null references convenios(id),
  nombre text not null,
  descripcion text,
  tasa_nominal_anual numeric not null,
  metodo_interes text not null check (metodo_interes in ('flat','declining_balance')),
  periodo_gracia_dias int not null default 0,
  plazo_min int,
  plazo_max int,
  monto_min numeric,
  monto_max numeric,
  frecuencia text not null check (frecuencia in ('semanal','quincenal','mensual')),
  requisito_ids text[] not null default '{}',
  actividad_economica_ids text[] not null default '{}'
);

create table prospectos (
  id text primary key,
  nombre text not null,
  documento text not null,
  telefono text,
  email text,
  sexo text check (sexo in ('M','F','otro')),
  zona text,
  facilitador_id text references usuarios(id),
  estado text not null check (estado in ('nuevo','contactado','convertido','descartado')),
  fecha_registro date,
  canal_preferido text check (canal_preferido in ('whatsapp','llamada','email','visita')),
  canal_captacion text check (canal_captacion in ('referido','redes_sociales','evento','visita_facilitador','otro'))
);

create table actividades_crm (
  id text primary key,
  prospecto_id text not null references prospectos(id),
  tipo text not null check (tipo in ('llamada','visita','whatsapp','nota')),
  fecha date not null,
  descripcion text,
  resultado text,
  facilitador_id text references usuarios(id)
);

create table clientes (
  id text primary key,
  nombre text not null,
  documento text not null,
  fecha_nacimiento date,
  genero text check (genero in ('M','F')),
  actividad_economica text,
  zona text,
  telefono text,
  estado text not null check (estado in ('activo','inactivo','moroso','al_dia')),
  creditos_activos int not null default 0,
  total_prestado numeric not null default 0,
  facilitador_id text references usuarios(id)
);

create table solicitudes (
  id text primary key,
  cliente_id text not null references clientes(id),
  cliente_nombre text,
  producto_id text not null references productos_credito(id),
  producto_nombre text,
  monto_solicitado numeric not null,
  plazo int not null,
  estado text not null check (estado in ('borrador','enviada','scoring','revision_comite','aprobada','rechazada','firma','desembolsada')),
  score int,
  banda_riesgo text check (banda_riesgo in ('A','B','C','D','E')),
  fecha_solicitud date,
  facilitador_id text references usuarios(id)
);

create table creditos (
  id text primary key,
  cliente_id text not null references clientes(id),
  cliente_nombre text,
  producto_nombre text,
  convenio_id text references convenios(id),
  fecha_desembolso date,
  monto_desembolsado numeric not null,
  saldo_capital numeric not null,
  cuotas_total int not null,
  cuotas_pagadas int not null default 0,
  proxima_cuota date,
  dias_mora int not null default 0,
  estado text not null check (estado in ('activo','al_dia','en_mora','cancelado','castigado'))
);

create table cobranzas (
  id text primary key,
  cliente_id text not null references clientes(id),
  cliente_nombre text,
  credito_id text not null references creditos(id),
  fecha date not null,
  banco text,
  numero_deposito text,
  monto numeric not null,
  cuotas_aplicadas int[] not null default '{}',
  creado_por text references usuarios(id)
);

create table pagos (
  id text primary key,
  credito_id text not null,
  cuota_num int not null,
  fecha date not null,
  monto_capital numeric,
  monto_interes numeric,
  monto_total numeric,
  metodo text check (metodo in ('efectivo','transferencia','pse')),
  referencia text,
  registrado_por text
);
comment on column pagos.credito_id is 'Sin FK: los mocks referencian cred-001/cred-002 que no existen en creditos (cred-01..03)';

create table visitas (
  id text primary key,
  cliente_id text,
  cliente_nombre text not null,
  tipo text not null check (tipo in ('cobranza','seguimiento','prospecto','grupo')),
  fecha date not null,
  hora text,
  zona text,
  estado text not null check (estado in ('pendiente','realizada','reprogramada')),
  motivo text,
  nota text
);
comment on column visitas.cliente_id is 'Sin FK: los mocks referencian cli-001..004 que no coinciden con clientes (cli-01..04)';

create table kpi_reportes (
  id text primary key,
  datos jsonb not null
);

-- ─── Permisos y RLS base ─────────────────────────────────────
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
-- Nota: la política genérica inicial (acceso_autenticado) fue reemplazada
-- por la matriz RBAC de 0003_transaccional_rbac.sql.
