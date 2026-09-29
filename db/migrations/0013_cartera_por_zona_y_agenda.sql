-- ═══════════════════════════════════════════════════════════════
-- 0013 — Cartera por zona, agenda del facilitador y scoring provisional
-- Acuerdo (Miguel, 2026-09-29): el facilitador se asigna por ZONA y lleva
-- los créditos de los clientes de esa zona. Una zona tiene un facilitador;
-- un facilitador puede tener varias zonas.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Zonas ───────────────────────────────────────────────────
create table if not exists public.zonas (
  id              text primary key,
  nombre          text not null,
  organizacion_id text references public.organizaciones(id),
  facilitador_id  text references public.usuarios(id) on delete set null,
  -- Mismo formato que productos_credito.cobertura: 'bogota', 'bogota|usme',
  -- 'soacha', '*otras'. Vacía = la zona no se asigna automáticamente por dirección.
  cobertura       text[] not null default '{}',
  descripcion     text,
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  unique (organizacion_id, nombre)
);

alter table public.zonas enable row level security;
grant select, insert, update, delete on public.zonas to authenticated;

drop policy if exists sel_whitelist on public.zonas;
drop policy if exists ins_gestion  on public.zonas;
drop policy if exists upd_gestion  on public.zonas;
drop policy if exists del_gestion  on public.zonas;
create policy sel_whitelist on public.zonas for select to authenticated using (public.fn_rol_actual() is not null);
create policy ins_gestion on public.zonas for insert to authenticated with check (public.fn_rol_actual() in ('administrador','coordinador'));
create policy upd_gestion on public.zonas for update to authenticated using (public.fn_rol_actual() in ('administrador','coordinador'));
create policy del_gestion on public.zonas for delete to authenticated using (public.fn_rol_actual() = 'administrador');

-- Solo usuarios con rol facilitador pueden llevar una zona
create or replace function public.fn_validar_zona() returns trigger
language plpgsql as $$
begin
  if new.facilitador_id is not null and not exists (
       select 1 from public.usuarios where id = new.facilitador_id and rol = 'facilitador') then
    raise exception 'El usuario asignado a la zona debe tener rol facilitador';
  end if;
  new.nombre := btrim(new.nombre);
  return new;
end $$;
drop trigger if exists trg_validar_zona on public.zonas;
create trigger trg_validar_zona before insert or update on public.zonas
  for each row execute function public.fn_validar_zona();

-- Semilla: una zona por cada nombre de zona ya usado en los datos
insert into public.zonas (id, nombre, organizacion_id)
select distinct on (public.fn_norm_txt(z))
       'zona-' || regexp_replace(public.fn_norm_txt(z), '[^a-z0-9]+', '-', 'g'), btrim(z), 'org-co-01'
from (
  select zona z from public.clientes union all
  select zona from public.prospectos union all
  select zona from public.usuarios where rol in ('facilitador','coordinador') union all
  select zona from public.visitas
) s
where coalesce(btrim(z), '') <> ''
on conflict do nothing;

-- El facilitador que hoy tiene la zona en su ficha la conserva
update public.zonas z set facilitador_id = u.id
from public.usuarios u
where u.rol = 'facilitador' and public.fn_norm_txt(u.zona) = public.fn_norm_txt(z.nombre)
  and z.facilitador_id is null;

-- ─── 2. Columnas nuevas ─────────────────────────────────────────
alter table public.clientes   add column if not exists zona_id text references public.zonas(id);
alter table public.prospectos add column if not exists zona_id text references public.zonas(id);
alter table public.clientes   add column if not exists actividad_economica_id text references public.actividades_economicas(id);
create index if not exists idx_clientes_zona   on public.clientes(zona_id);
create index if not exists idx_prospectos_zona on public.prospectos(zona_id);
create index if not exists idx_creditos_cliente on public.creditos(cliente_id);

-- Actividad económica: de texto libre al catálogo (coincidencia por prefijo normalizado)
update public.clientes c set actividad_economica_id = a.id
from public.actividades_economicas a
where c.actividad_economica_id is null and coalesce(c.actividad_economica, '') <> ''
  and public.fn_norm_txt(a.nombre) like public.fn_norm_txt(c.actividad_economica) || '%';

-- ─── 3. Resolución de zona y facilitador ───────────────────────
-- Zona que cubre una dirección (la coincidencia por localidad gana a la de ciudad).
create or replace function public.fn_zona_por_ubicacion(p_ciudad text, p_localidad text)
returns text language sql stable set search_path = public as $$
  select z.id from zonas z
  where z.activo and cardinality(z.cobertura) > 0
    and fn_cobertura_incluye(z.cobertura, p_ciudad, p_localidad)
  order by exists (select 1 from unnest(z.cobertura) x
                   where fn_norm_txt(x) = fn_norm_txt(p_ciudad) || '|' || fn_norm_txt(p_localidad)) desc,
           z.id
  limit 1
$$;

-- Clientes y prospectos: zona_id manda; de ella salen zona (nombre) y facilitador.
create or replace function public.fn_asignar_zona() returns trigger
language plpgsql set search_path = public as $$
declare v_nombre text; v_fac text;
begin
  if tg_op = 'INSERT' then
    -- Zona elegida explícitamente (por nombre) gana; si no, la que cubre la dirección.
    if new.zona_id is null then
      new.zona_id := coalesce(
        (select id from zonas where fn_norm_txt(nombre) = fn_norm_txt(new.zona) limit 1),
        fn_zona_por_ubicacion(new.ciudad, new.localidad));
    end if;
  elsif new.zona_id is not distinct from old.zona_id then
    if new.zona is distinct from old.zona and coalesce(new.zona, '') <> '' then
      new.zona_id := coalesce((select id from zonas where fn_norm_txt(nombre) = fn_norm_txt(new.zona) limit 1), new.zona_id);
    elsif (new.ciudad, new.localidad) is distinct from (old.ciudad, old.localidad) then
      new.zona_id := coalesce(fn_zona_por_ubicacion(new.ciudad, new.localidad), new.zona_id);
    end if;
  end if;

  if new.zona_id is not null then
    select nombre, facilitador_id into v_nombre, v_fac from zonas where id = new.zona_id;
    new.zona := v_nombre;
    new.facilitador_id := v_fac;   -- regla: el facilitador es el de la zona (null = zona sin asignar)
  end if;
  return new;
end $$;

drop trigger if exists trg_asignar_zona on public.clientes;
create trigger trg_asignar_zona before insert or update on public.clientes
  for each row execute function public.fn_asignar_zona();
drop trigger if exists trg_asignar_zona on public.prospectos;
create trigger trg_asignar_zona before insert or update on public.prospectos
  for each row execute function public.fn_asignar_zona();

-- Cambiar el facilitador o el nombre de una zona reasigna su cartera.
create or replace function public.fn_propagar_zona() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.facilitador_id is distinct from old.facilitador_id or new.nombre is distinct from old.nombre then
    update clientes   set zona = new.nombre, facilitador_id = new.facilitador_id where zona_id = new.id;
    update prospectos set zona = new.nombre, facilitador_id = new.facilitador_id where zona_id = new.id;
    -- usuarios.zona es informativo: refleja la(s) zona(s) que lleva el facilitador
    update usuarios u set zona = (select string_agg(z.nombre, ', ' order by z.nombre) from zonas z where z.facilitador_id = u.id)
    where u.id in (new.facilitador_id, old.facilitador_id);
  end if;
  return new;
end $$;
drop trigger if exists trg_propagar_zona on public.zonas;
create trigger trg_propagar_zona after update on public.zonas
  for each row execute function public.fn_propagar_zona();

-- Backfill: dispara fn_asignar_zona en los registros existentes
update public.clientes   set zona_id = (select id from public.zonas where public.fn_norm_txt(nombre) = public.fn_norm_txt(clientes.zona) limit 1)   where zona_id is null;
update public.prospectos set zona_id = (select id from public.zonas where public.fn_norm_txt(nombre) = public.fn_norm_txt(prospectos.zona) limit 1) where zona_id is null;

-- ─── 4. Visibilidad por facilitador ────────────────────────────
-- Ven toda la cartera: administrador, coordinador, auditor y comité.
create or replace function public.fn_ve_toda_cartera() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(fn_rol_actual() in ('administrador','coordinador','auditor','comite'), false)
$$;

create or replace function public.fn_mis_zonas() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}') from zonas where facilitador_id = (fn_usuario_actual()).id
$$;

-- Clientes del facilitador actual: los de sus zonas, más los suyos sin zona.
create or replace function public.fn_mis_clientes() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(c.id), '{}') from clientes c
  where c.zona_id = any(fn_mis_zonas())
     or (c.zona_id is null and c.facilitador_id = (fn_usuario_actual()).id)
$$;

create or replace function public.fn_mis_creditos() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}') from creditos where cliente_id = any(fn_mis_clientes())
$$;

create or replace function public.fn_mis_solicitantes() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(s.id), '{}') from solicitantes s
  where s.cliente_id = any(fn_mis_clientes())
     or fn_zona_por_ubicacion(s.ciudad, s.localidad) = any(fn_mis_zonas())
$$;

create or replace function public.fn_puede_ver_credito(p_credito_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select fn_ve_toda_cartera() or p_credito_id = any(fn_mis_creditos())
$$;

grant execute on function public.fn_ve_toda_cartera(), public.fn_mis_zonas(), public.fn_mis_clientes(),
  public.fn_mis_creditos(), public.fn_mis_solicitantes(), public.fn_puede_ver_credito(text),
  public.fn_zona_por_ubicacion(text, text) to authenticated;

-- clientes
drop policy if exists sel_whitelist on public.clientes;
drop policy if exists upd_operacion on public.clientes;
create policy sel_whitelist on public.clientes for select to authenticated
  using (public.fn_ve_toda_cartera() or id = any((select public.fn_mis_clientes())::text[]));
create policy upd_operacion on public.clientes for update to authenticated
  using (public.fn_rol_actual() in ('administrador','coordinador')
         or (public.fn_rol_actual() = 'facilitador' and id = any((select public.fn_mis_clientes())::text[])));

-- créditos y todo lo que cuelga de ellos
drop policy if exists sel_whitelist on public.creditos;
create policy sel_whitelist on public.creditos for select to authenticated
  using (public.fn_ve_toda_cartera() or cliente_id = any((select public.fn_mis_clientes())::text[]));
drop policy if exists sel_whitelist on public.cronograma_cuotas;
create policy sel_whitelist on public.cronograma_cuotas for select to authenticated
  using (public.fn_ve_toda_cartera() or credito_id = any((select public.fn_mis_creditos())::text[]));
drop policy if exists sel_whitelist on public.cargos_atraso;
create policy sel_whitelist on public.cargos_atraso for select to authenticated
  using (public.fn_ve_toda_cartera() or credito_id = any((select public.fn_mis_creditos())::text[]));
drop policy if exists sel_whitelist on public.pagos;
create policy sel_whitelist on public.pagos for select to authenticated
  using (public.fn_ve_toda_cartera() or credito_id = any((select public.fn_mis_creditos())::text[]));
drop policy if exists sel_whitelist on public.cobranzas;
create policy sel_whitelist on public.cobranzas for select to authenticated
  using (public.fn_ve_toda_cartera() or cliente_id = any((select public.fn_mis_clientes())::text[]));

-- solicitudes: las de sus clientes, las que creó y las del portal de su zona
drop policy if exists sel_whitelist on public.solicitudes;
drop policy if exists upd_operacion on public.solicitudes;
create policy sel_whitelist on public.solicitudes for select to authenticated
  using (public.fn_ve_toda_cartera()
         or (public.fn_rol_actual() = 'facilitador' and (
               cliente_id = any((select public.fn_mis_clientes())::text[])
            or facilitador_id = (public.fn_usuario_actual()).id
            or solicitante_id = any((select public.fn_mis_solicitantes())::text[]))));
create policy upd_operacion on public.solicitudes for update to authenticated
  using (public.fn_rol_actual() in ('administrador','coordinador')
         or (public.fn_rol_actual() = 'facilitador' and (
               cliente_id = any((select public.fn_mis_clientes())::text[])
            or facilitador_id = (public.fn_usuario_actual()).id
            or solicitante_id = any((select public.fn_mis_solicitantes())::text[]))));

-- solicitantes del portal y sus adjuntos
drop policy if exists sel_whitelist on public.solicitantes;
create policy sel_whitelist on public.solicitantes for select to authenticated
  using (public.fn_ve_toda_cartera() or id = any((select public.fn_mis_solicitantes())::text[]));
drop policy if exists sel_whitelist on public.solicitante_documentos;
create policy sel_whitelist on public.solicitante_documentos for select to authenticated
  using (public.fn_ve_toda_cartera() or solicitante_id = any((select public.fn_mis_solicitantes())::text[]));
drop policy if exists sel_whitelist on public.solicitante_requisitos;
create policy sel_whitelist on public.solicitante_requisitos for select to authenticated
  using (public.fn_ve_toda_cartera() or solicitante_id = any((select public.fn_mis_solicitantes())::text[]));

-- prospectos
drop policy if exists sel_whitelist on public.prospectos;
drop policy if exists upd_operacion on public.prospectos;
create policy sel_whitelist on public.prospectos for select to authenticated
  using (public.fn_ve_toda_cartera()
         or zona_id = any((select public.fn_mis_zonas())::text[])
         or (zona_id is null and facilitador_id = (public.fn_usuario_actual()).id));
create policy upd_operacion on public.prospectos for update to authenticated
  using (public.fn_rol_actual() in ('administrador','coordinador')
         or (public.fn_rol_actual() = 'facilitador' and (
               zona_id = any((select public.fn_mis_zonas())::text[])
            or (zona_id is null and facilitador_id = (public.fn_usuario_actual()).id))));

-- visitas
drop policy if exists sel_whitelist on public.visitas;
drop policy if exists upd_operacion on public.visitas;
create policy sel_whitelist on public.visitas for select to authenticated
  using (public.fn_ve_toda_cartera()
         or facilitador_id = (public.fn_usuario_actual()).id
         or cliente_id = any((select public.fn_mis_clientes())::text[]));
create policy upd_operacion on public.visitas for update to authenticated
  using (public.fn_rol_actual() in ('administrador','coordinador')
         or (public.fn_rol_actual() = 'facilitador' and (
               facilitador_id = (public.fn_usuario_actual()).id
            or cliente_id = any((select public.fn_mis_clientes())::text[]))));

-- CRM de prospectos: los de prospectos visibles
drop policy if exists sel_whitelist on public.actividades_crm;
create policy sel_whitelist on public.actividades_crm for select to authenticated
  using (public.fn_ve_toda_cartera()
         or facilitador_id = (public.fn_usuario_actual()).id
         or prospecto_id in (select id from public.prospectos));

-- Funciones SECURITY DEFINER de dinero: un facilitador solo opera su cartera.
create or replace function public.fn_guardar_cartera_cobranza() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if fn_rol_actual() = 'facilitador' and not fn_puede_ver_credito(new.credito_id) then
    raise exception 'El crédito % no pertenece a tu cartera', new.credito_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_guardar_cartera on public.cobranzas;
create trigger trg_guardar_cartera before insert on public.cobranzas
  for each row execute function public.fn_guardar_cartera_cobranza();

-- estado_cuenta: misma guarda (se inserta tras cargar el crédito)
do $$
declare v_def text; v_nuevo text;
begin
  v_def := pg_get_functiondef('public.estado_cuenta(text, date)'::regprocedure);
  if position('fn_puede_ver_credito' in v_def) = 0 then
    v_nuevo := replace(v_def,
      'if not found then raise exception ''Crédito % no existe'', p_credito_id; end if;',
      'if not found then raise exception ''Crédito % no existe'', p_credito_id; end if;
  if not public.fn_puede_ver_credito(p_credito_id) then raise exception ''El crédito % no pertenece a tu cartera'', p_credito_id; end if;');
    if v_nuevo = v_def then raise exception 'No se pudo parchear estado_cuenta'; end if;
    execute v_nuevo;
  end if;
end $$;

-- ─── 5. Scoring provisional ────────────────────────────────────
-- Con los datos disponibles (historial de cuotas en SiCrecer). 0–1000 puntos:
--   Puntualidad        350  % de cuotas exigibles pagadas dentro de la gracia
--   Peor atraso        200  máximo de días de atraso de cualquier cuota
--   Situación actual   200  cuotas vencidas hoy
--   Experiencia        150  créditos cancelados en SiCrecer
--   Incremento         100  monto pedido / último monto desembolsado
-- Bandas: A ≥ 850 · B ≥ 700 · C ≥ 550 · D ≥ 400 · E < 400.
-- Preaprobado: banda A/B, sin cuotas vencidas hoy, peor atraso ≤ 30 días y ≥ 3 cuotas de historial.
create or replace function public.fn_scoring_cliente(p_cliente_id text, p_monto numeric default null)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  n int; n_punt int; v_max int; v_prom numeric; v_venc int; v_mora_hoy int;
  v_cancel int; v_ult numeric; v_ratio numeric;
  s_punt int; s_max int; s_act int; s_exp int; s_inc int; v_score int; v_banda text;
  v_pre text; v_sug numeric; r text[] := '{}';
begin
  if p_cliente_id is null then
    return jsonb_build_object('score', null, 'banda', null, 'preaprobacion', 'sin_historial', 'monto_sugerido', null,
      'razones', jsonb_build_array('Solicitante nuevo: sin historial de pagos en SiCrecer. Decide el comité.'));
  end if;

  select count(*),
         count(*) filter (where q.estado = 'pagada' and q.pagada_en <= q.fecha_vencimiento + coalesce(cr.dias_gracia_mora, 0)),
         coalesce(max(greatest(0, coalesce(q.pagada_en, current_date) - q.fecha_vencimiento)), 0),
         coalesce(avg(greatest(0, coalesce(q.pagada_en, current_date) - q.fecha_vencimiento)), 0),
         count(*) filter (where q.estado <> 'pagada')
    into n, n_punt, v_max, v_prom, v_venc
  from cronograma_cuotas q join creditos cr on cr.id = q.credito_id
  where cr.cliente_id = p_cliente_id and (q.fecha_vencimiento < current_date or q.estado = 'pagada');

  select coalesce(max(dias_mora) filter (where estado not in ('cancelado','castigado')), 0),
         count(*) filter (where estado = 'cancelado'),
         (array_agg(monto_desembolsado order by fecha_desembolso desc nulls last))[1]
    into v_mora_hoy, v_cancel, v_ult
  from creditos where cliente_id = p_cliente_id;

  if n = 0 then
    return jsonb_build_object('score', null, 'banda', null, 'preaprobacion', 'sin_historial',
      'monto_sugerido', null, 'ultimo_monto', v_ult,
      'razones', jsonb_build_array('Sin cuotas exigibles todavía: no hay comportamiento de pago que evaluar.'));
  end if;

  s_punt := round(350.0 * n_punt / n);
  s_max  := case when v_max = 0 then 200 when v_max <= 7 then 170 when v_max <= 15 then 130
                 when v_max <= 30 then 80 when v_max <= 60 then 30 else 0 end;
  s_act  := case when v_venc = 0 then 200 when v_mora_hoy <= 15 then 80 when v_mora_hoy <= 30 then 30 else 0 end;
  s_exp  := case when v_cancel >= 2 then 150 when v_cancel = 1 then 110 else 60 end;
  v_ratio := case when p_monto is null or coalesce(v_ult, 0) = 0 then null else p_monto / v_ult end;
  s_inc  := case when v_ratio is null then 70 when v_ratio <= 1 then 100 when v_ratio <= 1.3 then 80
                 when v_ratio <= 1.5 then 60 when v_ratio <= 2 then 30 else 0 end;
  v_score := s_punt + s_max + s_act + s_exp + s_inc;
  v_banda := case when v_score >= 850 then 'A' when v_score >= 700 then 'B' when v_score >= 550 then 'C'
                  when v_score >= 400 then 'D' else 'E' end;

  r := array_append(r, format('%s de %s cuotas pagadas a tiempo', n_punt, n));
  if v_max > 0 then r := array_append(r, format('Peor atraso: %s días', v_max)); end if;
  if v_venc > 0 then r := array_append(r, format('Tiene %s cuota(s) vencida(s) hoy (%s días de mora)', v_venc, v_mora_hoy)); end if;
  if v_cancel > 0 then r := array_append(r, format('%s crédito(s) cancelado(s) en SiCrecer', v_cancel)); end if;
  if v_ratio > 1.5 then r := array_append(r, format('Pide %sx su último monto', round(v_ratio, 1))); end if;

  if v_venc > 0 then
    v_pre := 'no_preaprobado'; r := array_append(r, 'No se preaprueba con cuotas vencidas');
  elsif v_banda in ('A','B') and v_max <= 30 and n >= 3 then
    v_pre := 'preaprobado';
  elsif v_banda in ('A','B','C') then
    v_pre := 'revision';
    if n < 3 then r := array_append(r, 'Historial corto (menos de 3 cuotas)'); end if;
  else
    v_pre := 'no_preaprobado';
  end if;

  v_sug := case v_pre
             when 'preaprobado' then round(coalesce(v_ult, 0) * case v_banda when 'A' then 1.5 else 1.2 end, -4)
             when 'revision'    then round(coalesce(v_ult, 0), -4)
             else null end;

  return jsonb_build_object(
    'score', v_score, 'banda', v_banda, 'preaprobacion', v_pre, 'monto_sugerido', v_sug,
    'ultimo_monto', v_ult, 'cuotas_evaluadas', n, 'cuotas_a_tiempo', n_punt,
    'peor_atraso_dias', v_max, 'atraso_promedio_dias', round(v_prom, 1),
    'cuotas_vencidas_hoy', v_venc, 'creditos_cancelados', v_cancel,
    'componentes', jsonb_build_object('puntualidad', s_punt, 'peor_atraso', s_max,
                                      'situacion_actual', s_act, 'experiencia', s_exp, 'incremento', s_inc),
    'razones', to_jsonb(r));
end $$;
grant execute on function public.fn_scoring_cliente(text, numeric) to authenticated;

-- Las solicitudes internas nuevas guardan su score (el comité lo ve)
create or replace function public.fn_score_solicitud() returns trigger
language plpgsql set search_path = public as $$
declare v jsonb;
begin
  if new.cliente_id is not null and new.score is null then
    v := fn_scoring_cliente(new.cliente_id, new.monto_solicitado);
    new.score := (v->>'score')::int;
    new.banda_riesgo := v->>'banda';
  end if;
  return new;
end $$;
drop trigger if exists trg_score_solicitud on public.solicitudes;
create trigger trg_score_solicitud before insert on public.solicitudes
  for each row execute function public.fn_score_solicitud();

-- ─── 6. Vistas de la agenda (respetan la RLS de quien consulta) ─
create or replace view public.v_cartera with (security_invoker = true) as
select cr.id as credito_id, cr.cliente_id, c.nombre as cliente_nombre, c.documento, c.telefono,
       c.zona_id, c.zona, c.facilitador_id, u.nombre as facilitador_nombre,
       cr.convenio_id, cv.cooperante as convenio, cr.producto_id, cr.producto_nombre,
       c.actividad_economica_id, coalesce(ae.nombre, c.actividad_economica) as actividad_economica,
       c.ciudad, c.localidad, c.direccion,
       cr.estado, cr.frecuencia, cr.fecha_desembolso, cr.monto_desembolsado, cr.saldo_capital, cr.cuota_actual,
       cr.cuotas_total, cr.cuotas_pagadas, greatest(cr.cuotas_total - cr.cuotas_pagadas, 0) as cuotas_restantes,
       cr.proxima_cuota, cr.dias_mora,
       q.cuotas_vencidas, q.monto_vencido, q.capital_vencido,
       coalesce(g.cargos_pendientes, 0) as cargos_pendientes,
       q.monto_vencido + coalesce(g.cargos_pendientes, 0) as total_vencido,
       case when cr.dias_mora = 0 then 'vigente' when cr.dias_mora <= 30 then '1-30'
            when cr.dias_mora <= 60 then '31-60' when cr.dias_mora <= 90 then '61-90' else '>90' end as tramo_mora
from public.creditos cr
join public.clientes c on c.id = cr.cliente_id
left join public.usuarios u on u.id = c.facilitador_id
left join public.convenios cv on cv.id = cr.convenio_id
left join public.actividades_economicas ae on ae.id = c.actividad_economica_id
left join lateral (
  select count(*) filter (where estado <> 'pagada' and fecha_vencimiento < current_date) as cuotas_vencidas,
         coalesce(sum(cuota - monto_pagado) filter (where estado <> 'pagada' and fecha_vencimiento < current_date), 0) as monto_vencido,
         coalesce(sum(capital - capital_pagado) filter (where estado <> 'pagada' and fecha_vencimiento < current_date), 0) as capital_vencido
  from public.cronograma_cuotas where credito_id = cr.id) q on true
left join lateral (
  select sum(monto - monto_pagado) as cargos_pendientes
  from public.cargos_atraso where credito_id = cr.id and estado = 'pendiente') g on true
where cr.estado not in ('cancelado', 'castigado');

-- Cobranza: vencido primero, luego lo que vence pronto.
create or replace view public.v_cola_cobranza with (security_invoker = true) as
select v.*,
       n.num as proxima_cuota_num, n.fecha_vencimiento as proxima_fecha,
       coalesce(n.cuota - n.monto_pagado, 0) as proxima_monto,
       (n.fecha_vencimiento - current_date) as dias_para_vencer,
       case when v.cuotas_vencidas > 0 or v.cargos_pendientes > 0 then 'vencido'
            when n.fecha_vencimiento - current_date <= 7 then 'por_vencer'
            else 'al_dia' end as prioridad,
       case when v.cuotas_vencidas > 0 or v.cargos_pendientes > 0 then 1
            when n.fecha_vencimiento - current_date <= 7 then 2 else 3 end as orden
from public.v_cartera v
left join lateral (
  select num, fecha_vencimiento, cuota, monto_pagado from public.cronograma_cuotas
  where credito_id = v.credito_id and estado <> 'pagada' and fecha_vencimiento >= current_date
  order by num limit 1) n on true;

-- Candidatos a renovación: créditos en su último 20 % (o dos últimas cuotas)
-- y créditos cancelados en los últimos 90 días sin crédito ni solicitud nueva.
create or replace view public.v_renovacion with (security_invoker = true) as
with base as (
  select cr.id as credito_id, cr.cliente_id, cr.estado, cr.monto_desembolsado, cr.cuotas_total, cr.cuotas_pagadas,
         greatest(cr.cuotas_total - cr.cuotas_pagadas, 0) as cuotas_restantes, cr.saldo_capital, cr.dias_mora,
         cr.proxima_cuota, cr.convenio_id, cr.producto_id, cr.producto_nombre,
         (select max(q.fecha_vencimiento) from public.cronograma_cuotas q where q.credito_id = cr.id) as fecha_fin
  from public.creditos cr
  where (cr.estado not in ('cancelado', 'castigado')
         and cr.cuotas_total - cr.cuotas_pagadas <= greatest(2, ceil(cr.cuotas_total * 0.2)))
     or (cr.estado = 'cancelado'
         and (select max(q.pagada_en) from public.cronograma_cuotas q where q.credito_id = cr.id) >= current_date - 90
         and not exists (select 1 from public.creditos o where o.cliente_id = cr.cliente_id
                         and o.estado not in ('cancelado','castigado')))
)
select b.*, case when b.estado = 'cancelado' then 'cancelado_reciente' else 'por_terminar' end as motivo,
       c.nombre as cliente_nombre, c.telefono, c.zona_id, c.zona, c.facilitador_id, u.nombre as facilitador_nombre,
       cv.cooperante as convenio, c.actividad_economica_id, coalesce(ae.nombre, c.actividad_economica) as actividad_economica,
       exists (select 1 from public.solicitudes s where s.cliente_id = b.cliente_id
               and s.estado in ('borrador','enviada','scoring','revision_comite','aprobada','firma')) as tiene_solicitud_abierta,
       public.fn_scoring_cliente(b.cliente_id, null) as scoring
from base b
join public.clientes c on c.id = b.cliente_id
left join public.usuarios u on u.id = c.facilitador_id
left join public.convenios cv on cv.id = b.convenio_id
left join public.actividades_economicas ae on ae.id = c.actividad_economica_id;

-- Solicitudes por aprobar, con la preaprobación calculada al momento.
create or replace view public.v_solicitudes_pendientes with (security_invoker = true) as
select s.id as solicitud_id, s.cliente_id, s.solicitante_id, s.origen, s.estado, s.fecha_solicitud,
       coalesce(c.nombre, st.nombre, s.cliente_nombre) as nombre, coalesce(c.telefono, st.telefono) as telefono,
       s.producto_id, s.producto_nombre, p.convenio_id, cv.cooperante as convenio,
       s.monto_solicitado, s.plazo,
       coalesce(c.zona_id, public.fn_zona_por_ubicacion(st.ciudad, st.localidad)) as zona_id,
       coalesce(c.zona, z.nombre) as zona,
       coalesce(c.facilitador_id, z.facilitador_id) as facilitador_id,
       u.nombre as facilitador_nombre,
       coalesce(c.actividad_economica_id, st.actividad_economica_id) as actividad_economica_id,
       coalesce(ae.nombre, c.actividad_economica) as actividad_economica,
       (current_date - s.fecha_solicitud) as dias_esperando,
       public.fn_scoring_cliente(s.cliente_id, s.monto_solicitado) as scoring
from public.solicitudes s
left join public.clientes c on c.id = s.cliente_id
left join public.solicitantes st on st.id = s.solicitante_id
left join public.zonas z on z.id = public.fn_zona_por_ubicacion(st.ciudad, st.localidad)
left join public.productos_credito p on p.id = s.producto_id
left join public.convenios cv on cv.id = p.convenio_id
left join public.usuarios u on u.id = coalesce(c.facilitador_id, z.facilitador_id)
left join public.actividades_economicas ae on ae.id = coalesce(c.actividad_economica_id, st.actividad_economica_id)
where s.estado in ('enviada', 'scoring', 'revision_comite');

grant select on public.v_cartera, public.v_cola_cobranza, public.v_renovacion, public.v_solicitudes_pendientes to authenticated;
