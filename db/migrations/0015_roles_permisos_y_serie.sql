-- ═══════════════════════════════════════════════════════════════
-- 0015 — Roles configurables con permisos por módulo
--        + serie mensual para los gráficos del dashboard
--
-- Modelo:
--   · roles.perfil = alcance de datos (uno de los 5 perfiles del sistema).
--     administrador / coordinador / auditor / comite ven toda la cartera;
--     facilitador ve solo la de sus zonas (0013). Además usuarios.rol sigue
--     existiendo y se sincroniza con el perfil del rol asignado.
--   · rol_permisos = qué puede hacer el rol en cada módulo (pantalla):
--     ver · editar (agregar/editar) · borrar.
--   · La base de datos aplica los permisos de escritura (RLS y funciones de
--     dinero); el frontend oculta pantallas y botones según los mismos permisos.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Catálogo de módulos ────────────────────────────────────
create table if not exists public.modulos (
  id       text primary key,
  nombre   text not null,
  grupo    text not null,
  orden    int  not null,
  acciones text[] not null default '{ver,editar,borrar}'   -- acciones que aplican a la pantalla
);
insert into public.modulos (id, nombre, grupo, orden, acciones) values
  ('dashboard',      'Dashboard',                 'General',        10, '{ver}'),
  ('agenda',         'Agenda y visitas',          'General',        20, '{ver,editar,borrar}'),
  ('calculadora',    'Calculadora',               'General',        30, '{ver}'),
  ('prospectos',     'Prospectos',                'Originación',    40, '{ver,editar,borrar}'),
  ('clientes',       'Clientes',                  'Originación',    50, '{ver,editar,borrar}'),
  ('solicitudes',    'Solicitudes y evaluación',  'Originación',    60, '{ver,editar,borrar}'),
  ('comite',         'Comité (votación)',         'Originación',    70, '{ver,editar}'),
  ('desembolsos',    'Desembolsos',               'Cartera',        80, '{ver,editar}'),
  ('cartera',        'Cartera',                   'Cartera',        90, '{ver}'),
  ('cobranza',       'Cobranza (registrar pagos)','Cartera',       100, '{ver,editar}'),
  ('cierre',         'Cierre mensual',            'Cartera',       110, '{ver,editar}'),
  ('reportes',       'Reportes',                  'Cartera',       120, '{ver}'),
  ('convenios',      'Convenios',                 'Datos',         130, '{ver,editar,borrar}'),
  ('productos',      'Productos',                 'Datos',         140, '{ver,editar,borrar}'),
  ('zonas',          'Zonas',                     'Datos',         150, '{ver,editar,borrar}'),
  ('requisitos',     'Requisitos',                'Datos',         160, '{ver,editar,borrar}'),
  ('actividades',    'Actividades económicas',    'Datos',         170, '{ver,editar,borrar}'),
  ('bancos',         'Bancos',                    'Datos',         180, '{ver,editar,borrar}'),
  ('comites',        'Comités (configuración)',   'Configuración', 190, '{ver,editar,borrar}'),
  ('usuarios',       'Usuarios',                  'Configuración', 200, '{ver,editar,borrar}'),
  ('roles',          'Roles y permisos',          'Configuración', 210, '{ver,editar,borrar}'),
  ('configuracion',  'Configuración general',     'Configuración', 220, '{ver,editar}')
on conflict (id) do update set nombre = excluded.nombre, grupo = excluded.grupo, orden = excluded.orden, acciones = excluded.acciones;

-- ─── 2. Roles y permisos ───────────────────────────────────────
create table if not exists public.roles (
  id          text primary key,
  nombre      text not null unique,
  descripcion text,
  perfil      text not null check (perfil in ('administrador','coordinador','facilitador','comite','auditor')),
  es_sistema  boolean not null default false,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table if not exists public.rol_permisos (
  rol_id  text not null references public.roles(id) on delete cascade,
  modulo  text not null references public.modulos(id) on delete cascade,
  ver     boolean not null default false,
  editar  boolean not null default false,
  borrar  boolean not null default false,
  primary key (rol_id, modulo)
);

insert into public.roles (id, nombre, descripcion, perfil, es_sistema) values
  ('rol-administrador', 'Administrador', 'Acceso total al sistema',                                   'administrador', true),
  ('rol-coordinador',   'Coordinador',   'Gestiona la operación y los desembolsos; ve toda la cartera', 'coordinador',   true),
  ('rol-facilitador',   'Facilitador',   'Asesor de campo: su zona, solicitudes, visitas y cobranza',  'facilitador',   true),
  ('rol-comite',        'Comité',        'Revisa y vota las solicitudes',                             'comite',        true),
  ('rol-auditor',       'Auditor',       'Solo lectura de cartera y reportes',                        'auditor',       true)
on conflict (id) do nothing;

-- Matriz inicial = comportamiento que tenía el sistema (ver · editar · borrar)
insert into public.rol_permisos (rol_id, modulo, ver, editar, borrar)
select r, m, p[1], p[2], p[3] from (values
  -- administrador: todo
  ('rol-administrador','dashboard',  array[true,false,false]),
  ('rol-administrador','agenda',     array[true,true,true]),
  ('rol-administrador','calculadora',array[true,false,false]),
  ('rol-administrador','prospectos', array[true,true,true]),
  ('rol-administrador','clientes',   array[true,true,true]),
  ('rol-administrador','solicitudes',array[true,true,true]),
  ('rol-administrador','comite',     array[true,true,false]),
  ('rol-administrador','desembolsos',array[true,true,false]),
  ('rol-administrador','cartera',    array[true,false,false]),
  ('rol-administrador','cobranza',   array[true,true,false]),
  ('rol-administrador','cierre',     array[true,true,false]),
  ('rol-administrador','reportes',   array[true,false,false]),
  ('rol-administrador','convenios',  array[true,true,true]),
  ('rol-administrador','productos',  array[true,true,true]),
  ('rol-administrador','zonas',      array[true,true,true]),
  ('rol-administrador','requisitos', array[true,true,true]),
  ('rol-administrador','actividades',array[true,true,true]),
  ('rol-administrador','bancos',     array[true,true,true]),
  ('rol-administrador','comites',    array[true,true,true]),
  ('rol-administrador','usuarios',   array[true,true,true]),
  ('rol-administrador','roles',      array[true,true,true]),
  ('rol-administrador','configuracion',array[true,true,false]),
  -- coordinador
  ('rol-coordinador','dashboard',  array[true,false,false]),
  ('rol-coordinador','agenda',     array[true,true,true]),
  ('rol-coordinador','calculadora',array[true,false,false]),
  ('rol-coordinador','prospectos', array[true,true,true]),
  ('rol-coordinador','clientes',   array[true,true,true]),
  ('rol-coordinador','solicitudes',array[true,true,true]),
  ('rol-coordinador','desembolsos',array[true,true,false]),
  ('rol-coordinador','cartera',    array[true,false,false]),
  ('rol-coordinador','cobranza',   array[true,true,false]),
  ('rol-coordinador','cierre',     array[true,true,false]),
  ('rol-coordinador','reportes',   array[true,false,false]),
  ('rol-coordinador','convenios',  array[true,false,false]),
  ('rol-coordinador','productos',  array[true,false,false]),
  ('rol-coordinador','zonas',      array[true,true,false]),
  ('rol-coordinador','requisitos', array[true,false,false]),
  ('rol-coordinador','actividades',array[true,false,false]),
  ('rol-coordinador','bancos',     array[true,false,false]),
  -- facilitador
  ('rol-facilitador','dashboard',  array[true,false,false]),
  ('rol-facilitador','agenda',     array[true,true,false]),
  ('rol-facilitador','calculadora',array[true,false,false]),
  ('rol-facilitador','prospectos', array[true,true,false]),
  ('rol-facilitador','clientes',   array[true,true,false]),
  ('rol-facilitador','solicitudes',array[true,true,false]),
  ('rol-facilitador','cartera',    array[true,false,false]),
  ('rol-facilitador','cobranza',   array[true,true,false]),
  -- comité
  ('rol-comite','dashboard',  array[true,false,false]),
  ('rol-comite','comite',     array[true,true,false]),
  -- auditor
  ('rol-auditor','dashboard', array[true,false,false]),
  ('rol-auditor','cartera',   array[true,false,false]),
  ('rol-auditor','cierre',    array[true,false,false]),
  ('rol-auditor','reportes',  array[true,false,false])
) v(r, m, p)
on conflict (rol_id, modulo) do nothing;

-- ─── 3. Usuarios ↔ roles ───────────────────────────────────────
alter table public.usuarios add column if not exists rol_id text references public.roles(id);
update public.usuarios set rol_id = 'rol-' || rol where rol_id is null;

-- usuarios.rol (perfil) sale del rol asignado; sin rol_id se toma el del perfil
create or replace function public.fn_sync_rol_usuario() returns trigger
language plpgsql set search_path = public as $$
declare v_perfil text; v_activo boolean;
begin
  -- Compatibilidad: si solo cambia el perfil (rol) se asigna el rol del sistema de ese perfil
  if new.rol_id is null
     or (tg_op = 'UPDATE' and new.rol is distinct from old.rol and new.rol_id is not distinct from old.rol_id) then
    new.rol_id := 'rol-' || new.rol;
  end if;
  select perfil, activo into v_perfil, v_activo from roles where id = new.rol_id;
  if v_perfil is null then raise exception 'El rol % no existe', new.rol_id; end if;
  if not v_activo and (tg_op = 'INSERT' or new.rol_id is distinct from old.rol_id) then
    raise exception 'El rol está inactivo';
  end if;
  new.rol := v_perfil;
  return new;
end $$;
drop trigger if exists trg_sync_rol_usuario on public.usuarios;
create trigger trg_sync_rol_usuario before insert or update of rol, rol_id on public.usuarios
  for each row execute function public.fn_sync_rol_usuario();

-- Cambiar el perfil de un rol actualiza a sus usuarios
create or replace function public.fn_propagar_perfil_rol() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.perfil is distinct from old.perfil then
    update usuarios set rol = new.perfil where rol_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_propagar_perfil_rol on public.roles;
create trigger trg_propagar_perfil_rol after update on public.roles
  for each row execute function public.fn_propagar_perfil_rol();

-- Roles del sistema: no se borran ni cambian de perfil
create or replace function public.fn_proteger_rol() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.es_sistema then raise exception 'El rol % es del sistema y no se puede borrar', old.nombre; end if;
    return old;
  end if;
  if old.es_sistema and (new.perfil is distinct from old.perfil or new.es_sistema is distinct from old.es_sistema or not new.activo) then
    raise exception 'El rol % es del sistema: no se puede cambiar su perfil ni desactivar', old.nombre;
  end if;
  return new;
end $$;
drop trigger if exists trg_proteger_rol on public.roles;
create trigger trg_proteger_rol before update or delete on public.roles
  for each row execute function public.fn_proteger_rol();

-- Anti-bloqueo: el Administrador conserva siempre usuarios y roles
create or replace function public.fn_proteger_permisos_admin() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.rol_id = 'rol-administrador' and old.modulo in ('roles','usuarios') then
      raise exception 'El Administrador no puede perder el acceso a %', old.modulo;
    end if;
    return old;
  end if;
  if new.rol_id = 'rol-administrador' and new.modulo in ('roles','usuarios') and not (new.ver and new.editar) then
    raise exception 'El Administrador no puede perder el acceso a %', new.modulo;
  end if;
  if new.editar or new.borrar then new.ver := true; end if;   -- quien edita o borra, ve
  return new;
end $$;
drop trigger if exists trg_proteger_permisos_admin on public.rol_permisos;
create trigger trg_proteger_permisos_admin before insert or update or delete on public.rol_permisos
  for each row execute function public.fn_proteger_permisos_admin();

-- ─── 4. Permiso del usuario actual ─────────────────────────────
create or replace function public.fn_permiso_actual(p_modulo text, p_accion text default 'ver')
returns boolean language plpgsql stable security definer set search_path = public as $$
declare u usuarios%rowtype; v boolean;
begin
  u := fn_usuario_actual();
  if u.id is null then return false; end if;
  select case p_accion when 'ver' then rp.ver when 'editar' then rp.editar when 'borrar' then rp.borrar else false end
    into v
  from rol_permisos rp join roles r on r.id = rp.rol_id
  where rp.rol_id = u.rol_id and rp.modulo = p_modulo and r.activo;
  return coalesce(v, false);
end $$;
grant execute on function public.fn_permiso_actual(text, text) to authenticated;

-- ─── 5. RLS de roles, permisos y módulos ───────────────────────
alter table public.modulos enable row level security;
alter table public.roles enable row level security;
alter table public.rol_permisos enable row level security;
grant select on public.modulos to authenticated;
grant select, insert, update, delete on public.roles, public.rol_permisos to authenticated;

drop policy if exists sel_whitelist on public.modulos;
create policy sel_whitelist on public.modulos for select to authenticated using (public.fn_rol_actual() is not null);

drop policy if exists sel_whitelist on public.roles;
drop policy if exists ins_permiso on public.roles;
drop policy if exists upd_permiso on public.roles;
drop policy if exists del_permiso on public.roles;
create policy sel_whitelist on public.roles for select to authenticated using (public.fn_rol_actual() is not null);
create policy ins_permiso on public.roles for insert to authenticated with check (public.fn_permiso_actual('roles','editar'));
create policy upd_permiso on public.roles for update to authenticated using (public.fn_permiso_actual('roles','editar')) with check (public.fn_permiso_actual('roles','editar'));
create policy del_permiso on public.roles for delete to authenticated using (public.fn_permiso_actual('roles','borrar'));

drop policy if exists sel_whitelist on public.rol_permisos;
drop policy if exists ins_permiso on public.rol_permisos;
drop policy if exists upd_permiso on public.rol_permisos;
drop policy if exists del_permiso on public.rol_permisos;
create policy sel_whitelist on public.rol_permisos for select to authenticated using (public.fn_rol_actual() is not null);
create policy ins_permiso on public.rol_permisos for insert to authenticated with check (public.fn_permiso_actual('roles','editar'));
create policy upd_permiso on public.rol_permisos for update to authenticated using (public.fn_permiso_actual('roles','editar')) with check (public.fn_permiso_actual('roles','editar'));
create policy del_permiso on public.rol_permisos for delete to authenticated using (public.fn_permiso_actual('roles','editar'));

-- ─── 6. Escrituras según permisos (reemplaza las reglas por nombre de rol) ─
-- Catálogos: el permiso decide
do $$
declare t record;
begin
  for t in select * from (values
      ('convenios','convenios'), ('productos_credito','productos'), ('requisitos','requisitos'),
      ('actividades_economicas','actividades'), ('bancos','bancos'), ('organizaciones','configuracion'),
      ('usuarios','usuarios'), ('comites','comites'), ('comite_miembros','comites'), ('zonas','zonas')) v(tabla, modulo)
  loop
    execute format('drop policy if exists ins_admin on public.%I', t.tabla);
    execute format('drop policy if exists upd_admin on public.%I', t.tabla);
    execute format('drop policy if exists del_admin on public.%I', t.tabla);
    execute format('drop policy if exists ins_gestion on public.%I', t.tabla);
    execute format('drop policy if exists upd_gestion on public.%I', t.tabla);
    execute format('drop policy if exists del_gestion on public.%I', t.tabla);
    execute format('drop policy if exists ins_permiso on public.%I', t.tabla);
    execute format('drop policy if exists upd_permiso on public.%I', t.tabla);
    execute format('drop policy if exists del_permiso on public.%I', t.tabla);
    execute format('create policy ins_permiso on public.%I for insert to authenticated with check (public.fn_permiso_actual(%L, ''editar''))', t.tabla, t.modulo);
    execute format('create policy upd_permiso on public.%I for update to authenticated using (public.fn_permiso_actual(%L, ''editar'')) with check (public.fn_permiso_actual(%L, ''editar''))', t.tabla, t.modulo, t.modulo);
    execute format('create policy del_permiso on public.%I for delete to authenticated using (public.fn_permiso_actual(%L, ''borrar''))', t.tabla, t.modulo);
  end loop;
end $$;

-- Operación: permiso + alcance de cartera (perfil facilitador = sus zonas)
drop policy if exists ins_operacion on public.clientes;
drop policy if exists upd_operacion on public.clientes;
drop policy if exists del_operacion on public.clientes;
create policy ins_operacion on public.clientes for insert to authenticated
  with check (public.fn_permiso_actual('clientes','editar'));
create policy upd_operacion on public.clientes for update to authenticated
  using (public.fn_permiso_actual('clientes','editar') and (public.fn_ve_toda_cartera() or id = any((select public.fn_mis_clientes())::text[])));
create policy del_operacion on public.clientes for delete to authenticated
  using (public.fn_permiso_actual('clientes','borrar') and (public.fn_ve_toda_cartera() or id = any((select public.fn_mis_clientes())::text[])));

drop policy if exists ins_operacion on public.prospectos;
drop policy if exists upd_operacion on public.prospectos;
drop policy if exists del_operacion on public.prospectos;
create policy ins_operacion on public.prospectos for insert to authenticated
  with check (public.fn_permiso_actual('prospectos','editar'));
create policy upd_operacion on public.prospectos for update to authenticated
  using (public.fn_permiso_actual('prospectos','editar') and (public.fn_ve_toda_cartera()
         or zona_id = any((select public.fn_mis_zonas())::text[])
         or (zona_id is null and facilitador_id = (public.fn_usuario_actual()).id)));
create policy del_operacion on public.prospectos for delete to authenticated
  using (public.fn_permiso_actual('prospectos','borrar') and (public.fn_ve_toda_cartera()
         or zona_id = any((select public.fn_mis_zonas())::text[])
         or (zona_id is null and facilitador_id = (public.fn_usuario_actual()).id)));

drop policy if exists ins_operacion on public.actividades_crm;
drop policy if exists upd_operacion on public.actividades_crm;
drop policy if exists del_operacion on public.actividades_crm;
create policy ins_operacion on public.actividades_crm for insert to authenticated
  with check (public.fn_permiso_actual('prospectos','editar'));
create policy upd_operacion on public.actividades_crm for update to authenticated
  using (public.fn_permiso_actual('prospectos','editar') and (public.fn_ve_toda_cartera()
         or facilitador_id = (public.fn_usuario_actual()).id or prospecto_id in (select id from public.prospectos)));
create policy del_operacion on public.actividades_crm for delete to authenticated
  using (public.fn_permiso_actual('prospectos','borrar') and (public.fn_ve_toda_cartera()
         or facilitador_id = (public.fn_usuario_actual()).id));

drop policy if exists ins_operacion on public.solicitudes;
drop policy if exists upd_operacion on public.solicitudes;
drop policy if exists del_operacion on public.solicitudes;
create policy ins_operacion on public.solicitudes for insert to authenticated
  with check (public.fn_permiso_actual('solicitudes','editar'));
create policy upd_operacion on public.solicitudes for update to authenticated
  using (public.fn_permiso_actual('solicitudes','editar') and (public.fn_ve_toda_cartera()
         or cliente_id = any((select public.fn_mis_clientes())::text[])
         or facilitador_id = (public.fn_usuario_actual()).id
         or solicitante_id = any((select public.fn_mis_solicitantes())::text[])));
create policy del_operacion on public.solicitudes for delete to authenticated
  using (public.fn_permiso_actual('solicitudes','borrar') and (public.fn_ve_toda_cartera()
         or cliente_id = any((select public.fn_mis_clientes())::text[])
         or facilitador_id = (public.fn_usuario_actual()).id));

drop policy if exists ins_operacion on public.evaluaciones;
drop policy if exists upd_operacion on public.evaluaciones;
drop policy if exists del_gestion on public.evaluaciones;
create policy ins_operacion on public.evaluaciones for insert to authenticated
  with check (public.fn_permiso_actual('solicitudes','editar') and solicitud_id in (select id from public.solicitudes));
create policy upd_operacion on public.evaluaciones for update to authenticated
  using (public.fn_permiso_actual('solicitudes','editar') and solicitud_id in (select id from public.solicitudes));
create policy del_gestion on public.evaluaciones for delete to authenticated
  using (public.fn_permiso_actual('solicitudes','borrar') and solicitud_id in (select id from public.solicitudes));

drop policy if exists ins_operacion on public.visitas;
drop policy if exists upd_operacion on public.visitas;
drop policy if exists del_operacion on public.visitas;
create policy ins_operacion on public.visitas for insert to authenticated
  with check (public.fn_permiso_actual('agenda','editar'));
create policy upd_operacion on public.visitas for update to authenticated
  using (public.fn_permiso_actual('agenda','editar') and (public.fn_ve_toda_cartera()
         or facilitador_id = (public.fn_usuario_actual()).id
         or cliente_id = any((select public.fn_mis_clientes())::text[])));
create policy del_operacion on public.visitas for delete to authenticated
  using (public.fn_permiso_actual('agenda','borrar') and (public.fn_ve_toda_cartera()
         or facilitador_id = (public.fn_usuario_actual()).id));

-- ─── 7. Funciones de dinero y comité: permiso en vez de nombre de rol ─
do $$
declare v_def text; v_nuevo text;
begin
  v_def := pg_get_functiondef('public.aplicar_pago(text, numeric, text, text, date, text, text)'::regprocedure);
  v_nuevo := replace(replace(v_def,
    'if v_usuario.rol not in (''administrador'', ''coordinador'', ''facilitador'') then',
    'if not public.fn_permiso_actual(''cobranza'', ''editar'') then'),
    'raise exception ''El rol % no puede registrar pagos'', v_usuario.rol;',
    'raise exception ''Tu rol no tiene permiso para registrar pagos'';');
  if v_nuevo <> v_def then execute v_nuevo; end if;

  v_def := pg_get_functiondef('public.desembolsar_solicitud(text, date)'::regprocedure);
  v_nuevo := replace(replace(v_def,
    'if v_u.id is null or v_u.rol not in (''administrador'', ''coordinador'') then',
    'if v_u.id is null or not public.fn_permiso_actual(''desembolsos'', ''editar'') then'),
    'Solo administrador o coordinador pueden registrar desembolsos', 'Tu rol no tiene permiso para registrar desembolsos');
  if v_nuevo <> v_def then execute v_nuevo; end if;

  v_def := pg_get_functiondef('public.enviar_a_comite(text)'::regprocedure);
  v_nuevo := replace(v_def,
    'if v_u.id is null or v_u.rol not in (''administrador'',''coordinador'',''facilitador'') then',
    'if v_u.id is null or not public.fn_permiso_actual(''solicitudes'', ''editar'') then');
  if v_nuevo <> v_def then execute v_nuevo; end if;
end $$;

-- Votar exige permiso de comité (además de ser miembro, regla de votar_solicitud)
create or replace function public.fn_guardar_permiso_voto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if fn_rol_actual() is not null and not fn_permiso_actual('comite', 'editar') then
    raise exception 'Tu rol no tiene permiso para votar en el comité';
  end if;
  return new;
end $$;
drop trigger if exists trg_guardar_permiso_voto on public.comite_votos;
create trigger trg_guardar_permiso_voto before insert or update on public.comite_votos
  for each row execute function public.fn_guardar_permiso_voto();

-- ─── 8. Serie mensual para el dashboard (12 meses, por crédito) ─
-- saldo y días de atraso al cierre de cada mes (reconstruidos del cronograma
-- y los anticipos), cuotas que vencían en el mes, lo recaudado y lo desembolsado.
create or replace view public.v_serie_mensual with (security_invoker = true) as
with meses as (
  select (date_trunc('month', current_date) - make_interval(months => g))::date as inicio
  from generate_series(0, 11) g
), m as (
  select inicio, (inicio + interval '1 month - 1 day')::date as fin,
         least((inicio + interval '1 month - 1 day')::date, current_date) as corte
  from meses
)
select m.inicio as mes, cr.id as credito_id, cr.convenio_id, cr.producto_id,
       c.zona_id, c.zona, c.facilitador_id, c.actividad_economica_id,
       greatest(cr.monto_desembolsado
         - coalesce((select sum(q.capital) from public.cronograma_cuotas q
                     where q.credito_id = cr.id and q.pagada_en <= m.corte), 0)
         - coalesce((select sum(p.monto_capital) from public.pagos p
                     where p.credito_id = cr.id and p.tipo = 'anticipo' and p.fecha <= m.corte), 0), 0) as saldo,
       coalesce((select m.corte - min(q.fecha_vencimiento) from public.cronograma_cuotas q
                 where q.credito_id = cr.id and q.fecha_vencimiento < m.corte
                   and (q.pagada_en is null or q.pagada_en > m.corte)), 0) as dias_mora,
       coalesce((select sum(q.cuota) from public.cronograma_cuotas q
                 where q.credito_id = cr.id and q.fecha_vencimiento between m.inicio and m.fin), 0) as esperado,
       coalesce((select sum(cb.monto) from public.cobranzas cb
                 where cb.credito_id = cr.id and cb.fecha between m.inicio and m.fin), 0) as recaudado,
       case when cr.fecha_desembolso between m.inicio and m.fin then cr.monto_desembolsado else 0 end as desembolsado
from m
cross join public.creditos cr
join public.clientes c on c.id = cr.cliente_id
where cr.fecha_desembolso <= m.fin and cr.estado <> 'castigado';

grant select on public.v_serie_mensual to authenticated;
