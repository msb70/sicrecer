-- ═══════════════════════════════════════════════════════════════
-- 0014 — Scoring FEM (SiCrecer_Flujo_Scoring_Preaprobacion_FEM, 29-sep-2026)
-- 100 puntos: Capacidad de pago 50 · Experiencia crediticia 30 · Voluntad de pago 20.
-- Semáforo: verde 80-100 · ámbar 65-79 · naranja 50-64 · rojo <50 o filtro.
-- Tope de cuota: cuota total ≤ 40 % del flujo libre mensual positivo.
-- El scoring orienta; toda aprobación la decide el comité (primer crédito siempre).
-- Reparto de capacidad acordado con Miguel: cobertura 30 + estabilidad 20.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Evaluación del asesor (visita / actualización en campo) ─
create table if not exists public.evaluaciones (
  id                    text primary key default 'eval-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'),
  solicitud_id          text not null unique references public.solicitudes(id) on delete cascade,
  asesor_id             text references public.usuarios(id),
  fecha_visita          date,
  -- Requisitos (obligatorios antes de puntuar)
  consentimiento_consulta boolean not null default false,
  requisitos_completos  boolean not null default false,
  destino               text,
  -- Capacidad tangible (mensual, en pesos)
  ventas_mensuales      numeric check (ventas_mensuales >= 0),
  costo_ventas          numeric check (costo_ventas >= 0),
  gastos_negocio        numeric check (gastos_negocio >= 0),
  gastos_hogar          numeric check (gastos_hogar >= 0),
  otras_cuotas          numeric not null default 0 check (otras_cuotas >= 0),
  fecha_inicio_negocio  date,
  variabilidad_ventas   text check (variabilidad_ventas in ('estable', 'moderada', 'alta')),
  -- Experiencia crediticia
  consulta_externa      text not null default 'no_consultada'
                        check (consulta_externa in ('no_consultada', 'sin_historial', 'al_dia', 'reporte_rectificado', 'reporte_negativo_vigente')),
  referencias_verificadas int not null default 0 check (referencias_verificadas between 0 and 10),
  -- Voluntad: veracidad comprobada (4 × 3 = 12)
  ver_identidad         boolean not null default false,
  ver_ventas_soportadas boolean not null default false,
  ver_referencias       boolean not null default false,
  ver_sin_discrepancias boolean not null default false,
  -- Voluntad: cumplimiento de compromisos verificables (4 × 2 = 8)
  comp_documentos       boolean not null default false,
  comp_citas            boolean not null default false,
  comp_servicios        boolean not null default false,
  comp_ahorro_capacitacion boolean not null default false,
  evidencias            text[] not null default '{}',
  discrepancias         text,
  observaciones         text,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

alter table public.evaluaciones enable row level security;
grant select, insert, update, delete on public.evaluaciones to authenticated;
drop policy if exists sel_visible on public.evaluaciones;
drop policy if exists ins_operacion on public.evaluaciones;
drop policy if exists upd_operacion on public.evaluaciones;
drop policy if exists del_gestion on public.evaluaciones;
create policy sel_visible on public.evaluaciones for select to authenticated
  using (public.fn_rol_actual() is not null and solicitud_id in (select id from public.solicitudes));
create policy ins_operacion on public.evaluaciones for insert to authenticated
  with check (public.fn_rol_actual() in ('administrador','coordinador','facilitador') and solicitud_id in (select id from public.solicitudes));
create policy upd_operacion on public.evaluaciones for update to authenticated
  using (public.fn_rol_actual() in ('administrador','coordinador','facilitador') and solicitud_id in (select id from public.solicitudes));
create policy del_gestion on public.evaluaciones for delete to authenticated
  using (public.fn_rol_actual() in ('administrador','coordinador'));

-- ─── 2. Resultado guardado en la solicitud ─────────────────────
alter table public.solicitudes add column if not exists semaforo text;
alter table public.solicitudes drop constraint if exists solicitudes_semaforo_check;
alter table public.solicitudes add constraint solicitudes_semaforo_check check (semaforo in ('verde', 'ambar', 'naranja', 'rojo'));
alter table public.solicitudes add column if not exists scoring jsonb;
alter table public.solicitudes add column if not exists monto_sugerido numeric;

-- ─── 3. Motor de scoring ───────────────────────────────────────
create or replace function public.fn_scoring_fem_calc(
  p_cliente_id text, p_producto_id text, p_monto numeric, p_plazo int, p_eval_id text,
  p_ruta text default 'nuevo', p_excluir_credito text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  e evaluaciones%rowtype; p productos_credito%rowtype;
  n int := 0; n_punt int := 0; v_max int := 0; v_venc int := 0; v_mora_hoy int := 0;
  v_ult numeric; v_saldo_vig numeric := 0; v_cancel int := 0; v_recurrente boolean;
  v_pa int; v_r numeric; v_cuota numeric; v_cuota_mes numeric; v_flujo numeric; v_ratio numeric;
  v_meses int; s_cob int := 0; s_ant int := 0; s_var int := 0; s_exp int := 0; s_ver int := 0; s_comp int := 0;
  v_score int; v_sem text; v_cap_mes numeric; v_cap_per numeric; v_monto_cap numeric; v_sug numeric;
  v_filtros text[] := '{}'; v_alertas text[] := '{}'; v_hechos text[] := '{}';
begin
  select * into p from productos_credito where id = p_producto_id;
  if p_eval_id is not null then select * into e from evaluaciones where id = p_eval_id; end if;

  -- Historial propio (cuotas exigibles o ya pagadas)
  if p_cliente_id is not null then
    select count(*),
           count(*) filter (where q.estado = 'pagada' and q.pagada_en <= q.fecha_vencimiento + coalesce(cr.dias_gracia_mora, 0)),
           coalesce(max(greatest(0, coalesce(q.pagada_en, current_date) - q.fecha_vencimiento)), 0),
           count(*) filter (where q.estado <> 'pagada')
      into n, n_punt, v_max, v_venc
    from cronograma_cuotas q join creditos cr on cr.id = q.credito_id
    where cr.cliente_id = p_cliente_id and (q.fecha_vencimiento < current_date or q.estado = 'pagada');
    select coalesce(max(dias_mora) filter (where estado not in ('cancelado','castigado')), 0),
           coalesce(sum(saldo_capital) filter (where estado not in ('cancelado','castigado') and id is distinct from p_excluir_credito), 0),
           count(*) filter (where estado = 'cancelado'),
           (array_agg(monto_desembolsado order by fecha_desembolso desc nulls last))[1]
      into v_mora_hoy, v_saldo_vig, v_cancel, v_ult
    from creditos where cliente_id = p_cliente_id;
  end if;
  v_recurrente := n > 0;

  if e.id is null then
    return jsonb_build_object('estado', 'sin_evaluacion', 'ruta', p_ruta, 'score', null, 'semaforo', null, 'banda', null,
      'preaprobacion', 'pendiente_visita', 'monto_sugerido', null, 'recurrente', v_recurrente,
      'razones', jsonb_build_array(case when p_ruta = 'renovacion'
        then 'Falta la actualización en campo del asesor para calcular el nuevo monto.'
        else 'Falta la visita del asesor: sin ventas, costos y gastos verificados no se puntúa.' end));
  end if;

  -- Requisitos y filtros
  if not e.consentimiento_consulta then v_filtros := array_append(v_filtros, 'Falta la autorización de consulta'); end if;
  if not e.requisitos_completos then v_filtros := array_append(v_filtros, 'Requisitos incompletos: devolver para subsanar'); end if;
  v_flujo := coalesce(e.ventas_mensuales, 0) - coalesce(e.costo_ventas, 0) - coalesce(e.gastos_negocio, 0)
             - coalesce(e.gastos_hogar, 0) - coalesce(e.otras_cuotas, 0);
  if e.ventas_mensuales is null then v_filtros := array_append(v_filtros, 'Faltan las ventas mensuales verificadas');
  elsif v_flujo <= 0 then v_filtros := array_append(v_filtros, 'El flujo libre mensual no es positivo'); end if;
  if v_mora_hoy > 30 then v_filtros := array_append(v_filtros, format('Tiene un crédito con %s días de mora', v_mora_hoy)); end if;

  -- Capacidad (50) = cobertura (30) + estabilidad (20)
  v_pa := fn_periodos_anio(coalesce(p.frecuencia, 'mensual'));
  v_r := coalesce(p.tasa_nominal_anual, 0) / 100.0 / v_pa;
  v_cuota := case when v_r > 0 then fn_cuota_frances(p_monto, v_r, p_plazo) else round(p_monto / greatest(p_plazo, 1)) end;
  v_cuota_mes := round(v_cuota * v_pa / 12.0);
  v_ratio := case when v_flujo > 0 then v_cuota_mes / v_flujo end;
  s_cob := case when v_ratio is null then 0 when v_ratio <= 0.20 then 30 when v_ratio <= 0.30 then 24
                when v_ratio <= 0.40 then 16 else 0 end;
  v_meses := case when e.fecha_inicio_negocio is null then 0
                  else (extract(year from age(current_date, e.fecha_inicio_negocio)) * 12
                        + extract(month from age(current_date, e.fecha_inicio_negocio)))::int end;
  s_ant := case when v_meses >= 36 then 12 when v_meses >= 12 then 8 when v_meses >= 6 then 4 else 0 end;
  s_var := case e.variabilidad_ventas when 'estable' then 8 when 'moderada' then 4 else 0 end;

  -- Experiencia (30)
  if v_recurrente then
    s_exp := case when n_punt * 100 >= n * 95 and v_max <= 7 then 30
                  when n_punt * 100 >= n * 85 and v_max <= 15 then 24
                  when n_punt * 100 >= n * 70 and v_max <= 30 then 15 else 5 end;
    v_hechos := array_append(v_hechos, format('%s de %s cuotas pagadas a tiempo; peor atraso %s días', n_punt, n, v_max));
  else
    s_exp := 15 + least(10, e.referencias_verificadas * 5) + case when e.consulta_externa = 'al_dia' then 5 else 0 end;
    v_hechos := array_append(v_hechos, format('Sin historial en SiCrecer: base 15 + %s referencias verificadas', e.referencias_verificadas));
  end if;
  if e.consulta_externa = 'reporte_negativo_vigente' then
    s_exp := least(s_exp, 5);
    v_alertas := array_append(v_alertas, 'Reporte adverso vigente: verificar vigencia, contexto y rectificación (revisión humana)');
  end if;
  s_exp := least(s_exp, 30);

  -- Voluntad (20) = veracidad (12) + compromisos (8)
  s_ver := 3 * ((e.ver_identidad)::int + (e.ver_ventas_soportadas)::int + (e.ver_referencias)::int + (e.ver_sin_discrepancias)::int);
  s_comp := 2 * ((e.comp_documentos)::int + (e.comp_citas)::int + (e.comp_servicios)::int + (e.comp_ahorro_capacitacion)::int);

  v_score := s_cob + s_ant + s_var + s_exp + s_ver + s_comp;
  v_sem := case when cardinality(v_filtros) > 0 then 'rojo' when v_score >= 80 then 'verde'
                when v_score >= 65 then 'ambar' when v_score >= 50 then 'naranja' else 'rojo' end;

  -- Monto sugerido: cuota ≤ 40 % del flujo libre, topes del producto y escalamiento (1,5× el anterior)
  if v_flujo > 0 then
    v_cap_mes := 0.40 * v_flujo;
    v_cap_per := v_cap_mes * 12.0 / v_pa;
    v_monto_cap := case when v_r > 0 then v_cap_per * (1 - power(1 + v_r, -p_plazo)) / v_r else v_cap_per * p_plazo end;
    v_sug := least(p_monto, v_monto_cap, coalesce(p.monto_max, p_monto));
    if v_ult is not null and p_ruta = 'renovacion' then v_sug := least(greatest(v_sug, 0), v_ult * 1.5); end if;
    v_sug := floor(v_sug / 10000) * 10000;
    if v_sug < coalesce(p.monto_min, 0) then
      v_alertas := array_append(v_alertas, 'El flujo libre no alcanza para el monto mínimo del producto');
      v_sug := null;
    end if;
  end if;
  if v_sem = 'rojo' then v_sug := null; end if;

  if v_ratio > 0.40 then
    v_alertas := array_append(v_alertas, format('La cuota pedida es el %s %% del flujo libre (tope 40 %%): ajustar monto o plazo', round(v_ratio * 100)));
  end if;
  if not v_recurrente and p_ruta = 'nuevo' then v_alertas := array_append(v_alertas, 'Primer crédito: siempre va al comité'); end if;
  if v_saldo_vig > 0 then
    v_alertas := array_append(v_alertas, format('Crédito vigente con saldo %s: verificar cierre o tratamiento', to_char(v_saldo_vig, 'FM999G999G999')));
  end if;
  if coalesce(btrim(e.discrepancias), '') <> '' then v_alertas := array_append(v_alertas, 'Discrepancia registrada: ' || e.discrepancias); end if;
  if e.fecha_visita is not null and e.fecha_visita < current_date - 90 then
    v_alertas := array_append(v_alertas, format('Datos de campo del %s: actualizar antes del comité', to_char(e.fecha_visita, 'DD/MM/YYYY')));
  end if;

  return jsonb_build_object(
    'estado', 'evaluada', 'ruta', p_ruta, 'evaluacion_id', e.id, 'fecha_visita', e.fecha_visita,
    'score', v_score, 'semaforo', v_sem,
    'banda', case v_sem when 'verde' then 'A' when 'ambar' then 'B' when 'naranja' then 'C' else 'E' end,
    'preaprobacion', case v_sem when 'verde' then 'preaprobado' when 'rojo' then 'no_preaprobado' else 'revision' end,
    'componentes', jsonb_build_object(
      'capacidad', s_cob + s_ant + s_var, 'cobertura', s_cob, 'estabilidad', s_ant + s_var,
      'antiguedad', s_ant, 'variabilidad', s_var,
      'experiencia', s_exp, 'voluntad', s_ver + s_comp, 'veracidad', s_ver, 'compromisos', s_comp),
    'ventas', e.ventas_mensuales, 'flujo_libre', v_flujo, 'cuota', v_cuota, 'cuota_mensual', v_cuota_mes,
    'proporcion_flujo', case when v_ratio is null then null else round(v_ratio * 100, 1) end,
    'monto_pedido', p_monto, 'plazo', p_plazo, 'monto_capacidad', round(v_monto_cap),
    'monto_sugerido', v_sug, 'monto_anterior', v_ult, 'meses_negocio', v_meses,
    'recurrente', v_recurrente, 'filtros', to_jsonb(v_filtros), 'alertas', to_jsonb(v_alertas),
    'razones', to_jsonb(v_filtros || v_alertas || v_hechos));
end $$;

-- Ruta 1: solicitud (crédito nuevo o renovación ya solicitada)
create or replace function public.fn_scoring_fem(p_solicitud_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s solicitudes%rowtype; v_eval text; v_prev text;
begin
  select * into s from solicitudes where id = p_solicitud_id;
  if not found then return null; end if;
  select id into v_eval from evaluaciones where solicitud_id = s.id;
  select id into v_prev from creditos where cliente_id = s.cliente_id and solicitud_id is distinct from s.id
    order by fecha_desembolso desc nulls last limit 1;
  return fn_scoring_fem_calc(s.cliente_id, s.producto_id, s.monto_solicitado, s.plazo, v_eval,
    case when v_prev is not null then 'renovacion' else 'nuevo' end, v_prev);
end $$;

-- Ruta 2: preaprobación condicional de renovación (T-30), con la última evaluación del cliente
create or replace function public.fn_scoring_fem_renovacion(p_credito_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c creditos%rowtype; v_eval text;
begin
  select * into c from creditos where id = p_credito_id;
  if not found then return null; end if;
  select ev.id into v_eval from evaluaciones ev join solicitudes s on s.id = ev.solicitud_id
  where s.cliente_id = c.cliente_id order by ev.fecha_visita desc nulls last, ev.creado_en desc limit 1;
  -- Propuesta: hasta 1,5 veces el crédito anterior, dentro del máximo del producto (el scoring la ajusta a la capacidad)
  return fn_scoring_fem_calc(c.cliente_id, c.producto_id,
    least(c.monto_desembolsado * 1.5, coalesce((select monto_max from productos_credito where id = c.producto_id), c.monto_desembolsado * 1.5)),
    c.cuotas_total, v_eval, 'renovacion', c.id);
end $$;

grant execute on function public.fn_scoring_fem_calc(text, text, numeric, int, text, text, text),
  public.fn_scoring_fem(text), public.fn_scoring_fem_renovacion(text) to authenticated;

-- Guarda el resultado en la solicitud
create or replace function public.fn_recalcular_scoring(p_solicitud_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  v := fn_scoring_fem(p_solicitud_id);
  update solicitudes set scoring = v,
    score = (v->>'score')::int,
    semaforo = v->>'semaforo',
    banda_riesgo = v->>'banda',
    monto_sugerido = (v->>'monto_sugerido')::numeric
  where id = p_solicitud_id;
  return v;
end $$;
grant execute on function public.fn_recalcular_scoring(text) to authenticated;

create or replace function public.fn_trg_touch_evaluacion() returns trigger
language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;
drop trigger if exists trg_touch_evaluacion on public.evaluaciones;
create trigger trg_touch_evaluacion before update on public.evaluaciones
  for each row execute function public.fn_trg_touch_evaluacion();

create or replace function public.fn_trg_rescore_desde_evaluacion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then perform fn_recalcular_scoring(old.solicitud_id);
  else perform fn_recalcular_scoring(new.solicitud_id); end if;
  return null;
end $$;
drop trigger if exists trg_rescore_evaluacion on public.evaluaciones;
create trigger trg_rescore_evaluacion after insert or update or delete on public.evaluaciones
  for each row execute function public.fn_trg_rescore_desde_evaluacion();

create or replace function public.fn_trg_rescore_solicitud() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform fn_recalcular_scoring(new.id);
  return null;
end $$;
-- Reemplaza el score de comportamiento de 0013 por el scoring FEM
drop trigger if exists trg_score_solicitud on public.solicitudes;
drop trigger if exists trg_rescore_solicitud on public.solicitudes;
create trigger trg_rescore_solicitud after insert or update of monto_solicitado, plazo, producto_id, cliente_id
  on public.solicitudes for each row execute function public.fn_trg_rescore_solicitud();

-- Recalcula las solicitudes existentes
select count(public.fn_recalcular_scoring(id)) from public.solicitudes;

-- ─── 4. Vistas de la agenda con el scoring FEM ────────────────
-- Renovación: alerta 30 días antes del vencimiento del crédito (ruta 2),
-- más créditos cancelados en los últimos 90 días sin crédito nuevo.
drop view if exists public.v_renovacion;
create view public.v_renovacion with (security_invoker = true) as
with base as (
  select cr.id as credito_id, cr.cliente_id, cr.estado, cr.monto_desembolsado, cr.cuotas_total, cr.cuotas_pagadas,
         greatest(cr.cuotas_total - cr.cuotas_pagadas, 0) as cuotas_restantes, cr.saldo_capital, cr.dias_mora,
         cr.proxima_cuota, cr.convenio_id, cr.producto_id, cr.producto_nombre,
         (select max(q.fecha_vencimiento) from public.cronograma_cuotas q where q.credito_id = cr.id) as fecha_fin,
         (select max(q.pagada_en) from public.cronograma_cuotas q where q.credito_id = cr.id) as ultimo_pago
  from public.creditos cr
  where cr.estado <> 'castigado'
)
select b.credito_id, b.cliente_id, b.estado, b.monto_desembolsado, b.cuotas_total, b.cuotas_pagadas,
       b.cuotas_restantes, b.saldo_capital, b.dias_mora, b.proxima_cuota, b.convenio_id, b.producto_id,
       b.producto_nombre, b.fecha_fin,
       case when b.estado = 'cancelado' then 'cancelado_reciente' else 'por_terminar' end as motivo,
       (b.fecha_fin - current_date) as dias_para_fin,
       c.nombre as cliente_nombre, c.telefono, c.zona_id, c.zona, c.facilitador_id, u.nombre as facilitador_nombre,
       cv.cooperante as convenio, c.actividad_economica_id, coalesce(ae.nombre, c.actividad_economica) as actividad_economica,
       exists (select 1 from public.solicitudes s where s.cliente_id = b.cliente_id
               and s.estado in ('borrador','enviada','scoring','revision_comite','aprobada','firma')) as tiene_solicitud_abierta,
       public.fn_scoring_fem_renovacion(b.credito_id) as scoring
from base b
join public.clientes c on c.id = b.cliente_id
left join public.usuarios u on u.id = c.facilitador_id
left join public.convenios cv on cv.id = b.convenio_id
left join public.actividades_economicas ae on ae.id = c.actividad_economica_id
where (b.estado not in ('cancelado', 'castigado') and b.fecha_fin <= current_date + 30 and b.dias_mora <= 30)
   or (b.estado = 'cancelado' and b.ultimo_pago >= current_date - 90
       and not exists (select 1 from public.creditos o where o.cliente_id = b.cliente_id and o.estado not in ('cancelado','castigado')));

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
       coalesce(s.scoring, public.fn_scoring_fem(s.id)) as scoring
from public.solicitudes s
left join public.clientes c on c.id = s.cliente_id
left join public.solicitantes st on st.id = s.solicitante_id
left join public.zonas z on z.id = public.fn_zona_por_ubicacion(st.ciudad, st.localidad)
left join public.productos_credito p on p.id = s.producto_id
left join public.convenios cv on cv.id = p.convenio_id
left join public.usuarios u on u.id = coalesce(c.facilitador_id, z.facilitador_id)
left join public.actividades_economicas ae on ae.id = coalesce(c.actividad_economica_id, st.actividad_economica_id)
where s.estado in ('enviada', 'scoring', 'revision_comite');

grant select on public.v_renovacion, public.v_solicitudes_pendientes to authenticated;
