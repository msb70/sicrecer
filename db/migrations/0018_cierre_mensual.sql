-- ═══════════════════════════════════════════════════════════════
-- 0018 · Cierre mensual real por convenio
-- ───────────────────────────────────────────────────────────────
-- Hasta ahora "Cierre mensual" era un reporte calculado en vivo: no
-- se guardaba nada y un pago con fecha pasada o un anticipo cambiaba
-- las cifras de meses ya reportados. Esta migración agrega:
--   1. cierres_mensuales  · cabecera del cierre (totales congelados),
--      versionada: reabrir conserva la versión anterior como auditoría.
--   2. cierre_creditos    · foto por crédito al corte (saldo, mora…).
--   3. cierre_movimientos · ingresos/egresos del mes congelados.
--   4. cronograma_versiones · copia del cronograma antes de cada
--      reprogramación por anticipo (antes se sobrescribía).
--   5. fn_calcular_cierre (vista previa en vivo, misma lógica que el
--      cierre), cerrar_mes, reabrir_mes.
--   6. Bloqueo: no se pueden registrar/editar cobranzas, pagos ni
--      desembolsos con fecha en un mes cerrado del convenio.
--   7. Reconstrucción del histórico (origen = 'reconstruido').
--
-- Reglas:
--   · Solo se cierran meses ya terminados y en orden (no se cierra un
--     mes si el anterior con actividad sigue abierto).
--   · Solo el Administrador reabre, con motivo, y solo el último mes
--     cerrado del convenio.
--   · Cerrar exige permiso cierre/editar; ver, cierre/ver.
--
-- Fuente de las cifras al corte (último día del mes):
--   · Saldo de capital = desembolsado − capital pagado a la fecha de
--     corte. El capital pagado por cuota sale de `pagos` (con fecha);
--     si una cuota no tiene filas en `pagos` (datos semilla antiguos)
--     se usa capital_pagado + pagada_en. Más anticipos a la fecha.
--   · Mora: cuotas con vencimiento anterior al corte y no pagadas
--     al corte. Días = corte − vencimiento más antiguo impago.
--   · Recaudo = cobranzas del mes (efectivo). Desglose desde `pagos`
--     de esas cobranzas; lo que no tiene desglose va a rec_sin_desglose.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Tablas ─────────────────────────────────────────────────
create table if not exists public.cierres_mensuales (
  id                   text primary key,
  convenio_id          text not null references public.convenios(id),
  mes                  date not null check (mes = date_trunc('month', mes)::date),
  version              int  not null default 1,
  estado               text not null default 'cerrado' check (estado in ('cerrado', 'reabierto')),
  origen               text not null default 'manual' check (origen in ('manual', 'reconstruido')),
  corte                date not null,
  -- Egresos
  desembolsos_n        int     not null default 0,
  desembolsado         numeric not null default 0,
  servicios            numeric not null default 0,
  entregado            numeric not null default 0,
  -- Ingresos
  recaudos_n           int     not null default 0,
  recaudado            numeric not null default 0,
  rec_capital          numeric not null default 0,
  rec_interes          numeric not null default 0,
  rec_mora             numeric not null default 0,
  rec_gastos           numeric not null default 0,
  rec_anticipo         numeric not null default 0,
  rec_sin_desglose     numeric not null default 0,
  flujo_neto           numeric not null default 0,
  esperado             numeric not null default 0,
  -- Cartera al corte
  creditos_vigentes    int     not null default 0,
  saldo_capital        numeric not null default 0,
  capital_vencido      numeric not null default 0,
  creditos_en_mora     int     not null default 0,
  saldo_en_mora        numeric not null default 0,
  saldo_par30          numeric not null default 0,
  saldo_par90          numeric not null default 0,
  -- Auditoría
  cerrado_por          text,
  cerrado_por_nombre   text,
  cerrado_en           timestamptz not null default now(),
  reabierto_por        text,
  reabierto_por_nombre text,
  reabierto_en         timestamptz,
  motivo_reapertura    text,
  notas                text,
  unique (convenio_id, mes, version)
);
-- Un solo cierre vigente por convenio y mes
create unique index if not exists ux_cierre_vigente
  on public.cierres_mensuales (convenio_id, mes) where estado = 'cerrado';
create index if not exists ix_cierres_convenio_mes on public.cierres_mensuales (convenio_id, mes);

create table if not exists public.cierre_creditos (
  cierre_id          text not null references public.cierres_mensuales(id) on delete cascade,
  credito_id         text not null,
  cliente_nombre     text,
  producto_nombre    text,
  fecha_desembolso   date,
  monto_desembolsado numeric not null default 0,
  saldo_capital      numeric not null default 0,
  capital_vencido    numeric not null default 0,
  cuotas_vencidas    int     not null default 0,
  dias_mora          int     not null default 0,
  categoria          text    not null,   -- al_dia | mora_1_30 | mora_31_90 | mora_mas_90 | cancelado
  recaudado_mes      numeric not null default 0,
  desembolsado_mes   numeric not null default 0,
  primary key (cierre_id, credito_id)
);

create table if not exists public.cierre_movimientos (
  id             bigserial primary key,
  cierre_id      text not null references public.cierres_mensuales(id) on delete cascade,
  fecha          date not null,
  tipo           text not null check (tipo in ('ingreso', 'egreso')),
  credito_id     text,
  cliente_nombre text,
  concepto       text,
  referencia     text,
  monto          numeric not null default 0
);
create index if not exists ix_cierre_mov_cierre on public.cierre_movimientos (cierre_id);

create table if not exists public.cronograma_versiones (
  id            bigserial primary key,
  credito_id    text not null references public.creditos(id),
  version       int  not null,
  motivo        text not null,
  saldo_capital numeric,
  cuota_actual  numeric,
  cuotas        jsonb not null,
  creado_por    text,
  creado_en     timestamptz not null default now(),
  unique (credito_id, version)
);

-- ─── 2. RLS: solo lectura; se escribe por funciones ────────────
alter table public.cierres_mensuales   enable row level security;
alter table public.cierre_creditos     enable row level security;
alter table public.cierre_movimientos  enable row level security;
alter table public.cronograma_versiones enable row level security;

drop policy if exists sel_cierre on public.cierres_mensuales;
create policy sel_cierre on public.cierres_mensuales for select to authenticated
  using (public.fn_permiso_actual('cierre', 'ver')
         and exists (select 1 from public.convenios cv where cv.id = convenio_id and cv.organizacion_id = public.fn_org_actual()));
drop policy if exists sel_cierre on public.cierre_creditos;
create policy sel_cierre on public.cierre_creditos for select to authenticated
  using (exists (select 1 from public.cierres_mensuales c where c.id = cierre_id));   -- hereda la RLS de la cabecera
drop policy if exists sel_cierre on public.cierre_movimientos;
create policy sel_cierre on public.cierre_movimientos for select to authenticated
  using (exists (select 1 from public.cierres_mensuales c where c.id = cierre_id));
drop policy if exists sel_versiones on public.cronograma_versiones;
create policy sel_versiones on public.cronograma_versiones for select to authenticated
  using (exists (select 1 from public.creditos cr where cr.id = credito_id));       -- hereda la RLS de créditos

grant select on public.cierres_mensuales, public.cierre_creditos, public.cierre_movimientos,
                public.cronograma_versiones to authenticated;

-- ─── 3. Cálculo (única fuente de verdad para vista previa y cierre) ─
create or replace function public.fn_calcular_cierre(p_convenio_id text, p_mes date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_mes  date := date_trunc('month', p_mes)::date;
  v_fin  date := (date_trunc('month', p_mes) + interval '1 month - 1 day')::date;
  v_corte date;
  v_creditos jsonb; v_movs jsonb; v_tot jsonb;
begin
  v_corte := least(v_fin, current_date);

  with cr as (
    select * from creditos where convenio_id = p_convenio_id and fecha_desembolso <= v_corte
  ), q as (
    select q.credito_id, q.num, q.fecha_vencimiento, q.cuota, q.capital,
      case when exists (select 1 from pagos p where p.credito_id = q.credito_id and p.cuota_num = q.num and p.tipo = 'cuota')
           then coalesce((select sum(p.monto_capital) from pagos p
                          where p.credito_id = q.credito_id and p.cuota_num = q.num and p.tipo = 'cuota' and p.fecha <= v_corte), 0)
           else case when q.pagada_en <= v_corte then q.capital_pagado else 0 end
      end as cap_pag,
      (q.pagada_en is not null and q.pagada_en <= v_corte) as pagada_al_corte
    from cronograma_cuotas q join cr on cr.id = q.credito_id
  ), x as (
    select cr.id, cr.cliente_nombre, cr.producto_nombre, cr.fecha_desembolso, cr.monto_desembolsado,
      greatest(cr.monto_desembolsado
        - coalesce((select sum(q.cap_pag) from q where q.credito_id = cr.id), 0)
        - coalesce((select sum(p.monto_capital) from pagos p
                    where p.credito_id = cr.id and p.tipo = 'anticipo' and p.fecha <= v_corte), 0), 0) as saldo,
      coalesce((select sum(greatest(q.capital - q.cap_pag, 0)) from q
                where q.credito_id = cr.id and q.fecha_vencimiento < v_corte and not q.pagada_al_corte), 0) as cap_vencido,
      (select count(*) from q where q.credito_id = cr.id and q.fecha_vencimiento < v_corte and not q.pagada_al_corte)::int as cuotas_venc,
      coalesce((select v_corte - min(q.fecha_vencimiento) from q
                where q.credito_id = cr.id and q.fecha_vencimiento < v_corte and not q.pagada_al_corte), 0) as dias,
      coalesce((select sum(cb.monto) from cobranzas cb
                where cb.credito_id = cr.id and cb.fecha between v_mes and v_fin), 0) as rec_mes,
      case when cr.fecha_desembolso between v_mes and v_fin then cr.monto_desembolsado else 0 end as des_mes
    from cr
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'credito_id', id, 'cliente_nombre', cliente_nombre, 'producto_nombre', producto_nombre,
      'fecha_desembolso', fecha_desembolso, 'monto_desembolsado', monto_desembolsado,
      'saldo_capital', saldo, 'capital_vencido', cap_vencido, 'cuotas_vencidas', cuotas_venc,
      'dias_mora', dias,
      'categoria', case when saldo <= 0 then 'cancelado' when dias = 0 then 'al_dia'
                        when dias <= 30 then 'mora_1_30' when dias <= 90 then 'mora_31_90' else 'mora_mas_90' end,
      'recaudado_mes', rec_mes, 'desembolsado_mes', des_mes
    ) order by dias desc, saldo desc), '[]'::jsonb)
  into v_creditos from x;

  -- Movimientos del mes
  with m as (
    select cr.fecha_desembolso as fecha, 'egreso'::text as tipo, cr.id as credito_id, cr.cliente_nombre,
           'Desembolso — ' || coalesce(cr.producto_nombre, '') ||
             case when coalesce(cr.monto_servicios, 0) > 0
                  then ' (crédito ' || to_char(cr.monto_desembolsado, 'FM999G999G999') || ', servicios ' || to_char(cr.monto_servicios, 'FM999G999G999') || ')'
                  else '' end as concepto,
           upper(cr.id) as referencia,
           coalesce(cr.monto_entregado, cr.monto_desembolsado) as monto
    from creditos cr
    where cr.convenio_id = p_convenio_id and cr.fecha_desembolso between v_mes and v_fin
    union all
    select cb.fecha, 'ingreso', cb.credito_id, cb.cliente_nombre,
           'Pago' || case when coalesce(array_length(cb.cuotas_aplicadas, 1), 0) > 0
                          then ' (cuotas ' || array_to_string(cb.cuotas_aplicadas, ', ') || ')' else '' end
                  || ' — ' || coalesce(cr.producto_nombre, ''),
           cb.numero_deposito, cb.monto
    from cobranzas cb join creditos cr on cr.id = cb.credito_id
    where cr.convenio_id = p_convenio_id and cb.fecha between v_mes and v_fin
  )
  select coalesce(jsonb_agg(to_jsonb(m) order by m.fecha, m.tipo desc, m.referencia), '[]'::jsonb) into v_movs from m;

  -- Totales
  with cb as (
    select cb.* from cobranzas cb join creditos cr on cr.id = cb.credito_id
    where cr.convenio_id = p_convenio_id and cb.fecha between v_mes and v_fin
  ), p as (
    select p.* from pagos p where p.cobranza_id in (select id from cb)
  ), d as (
    select * from creditos where convenio_id = p_convenio_id and fecha_desembolso between v_mes and v_fin
  ), k as (
    select * from jsonb_to_recordset(v_creditos) as k(saldo_capital numeric, capital_vencido numeric, dias_mora int)
  ), e as (
    select coalesce(sum(q.cuota), 0) as esperado
    from cronograma_cuotas q join creditos cr on cr.id = q.credito_id
    where cr.convenio_id = p_convenio_id and q.fecha_vencimiento between v_mes and v_fin
  )
  select jsonb_build_object(
    'convenio_id', p_convenio_id, 'mes', v_mes, 'corte', v_corte, 'mes_terminado', v_fin < current_date,
    'desembolsos_n', (select count(*) from d),
    'desembolsado',  (select coalesce(sum(monto_desembolsado), 0) from d),
    'servicios',     (select coalesce(sum(monto_servicios), 0) from d),
    'entregado',     (select coalesce(sum(coalesce(monto_entregado, monto_desembolsado)), 0) from d),
    'recaudos_n',    (select count(*) from cb),
    'recaudado',     (select coalesce(sum(monto), 0) from cb),
    'rec_capital',   (select coalesce(sum(monto_capital) filter (where tipo = 'cuota'), 0) from p),
    'rec_interes',   (select coalesce(sum(monto_interes), 0) from p),
    'rec_mora',      (select coalesce(sum(monto_mora), 0) from p),
    'rec_gastos',    (select coalesce(sum(monto_gastos), 0) from p),
    'rec_anticipo',  (select coalesce(sum(monto_capital) filter (where tipo = 'anticipo'), 0) from p),
    'rec_sin_desglose', (select coalesce(sum(monto), 0) from cb) - (select coalesce(sum(monto_total), 0) from p),
    'flujo_neto',    (select coalesce(sum(monto), 0) from cb) - (select coalesce(sum(coalesce(monto_entregado, monto_desembolsado)), 0) from d),
    'esperado',      (select esperado from e),
    'creditos_vigentes', (select count(*) from k where saldo_capital > 0),
    'saldo_capital',     (select coalesce(sum(saldo_capital), 0) from k),
    'capital_vencido',   (select coalesce(sum(capital_vencido), 0) from k),
    'creditos_en_mora',  (select count(*) from k where saldo_capital > 0 and dias_mora > 0),
    'saldo_en_mora',     (select coalesce(sum(saldo_capital) filter (where dias_mora > 0), 0) from k),
    'saldo_par30',       (select coalesce(sum(saldo_capital) filter (where dias_mora > 30), 0) from k),
    'saldo_par90',       (select coalesce(sum(saldo_capital) filter (where dias_mora > 90), 0) from k)
  ) into v_tot;

  return jsonb_build_object('totales', v_tot, 'creditos', v_creditos, 'movimientos', v_movs);
end $$;

-- Vista previa para la web (valida permiso y organización)
create or replace function public.vista_previa_cierre(p_convenio_id text, p_mes date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.fn_permiso_actual('cierre', 'ver') then
    raise exception 'Tu rol no tiene permiso para ver el cierre mensual';
  end if;
  if not exists (select 1 from convenios where id = p_convenio_id and organizacion_id = (public.fn_usuario_actual()).organizacion_id) then
    raise exception 'Convenio % no encontrado', p_convenio_id;
  end if;
  return public.fn_calcular_cierre(p_convenio_id, p_mes);
end $$;

-- ─── 4. Registrar un cierre (interno) ──────────────────────────
create or replace function public.fn_registrar_cierre(
  p_convenio_id text, p_mes date, p_origen text, p_usuario_id text, p_usuario_nombre text, p_notas text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_mes date := date_trunc('month', p_mes)::date;
  v_calc jsonb; t jsonb; v_version int; v_id text;
begin
  v_calc := public.fn_calcular_cierre(p_convenio_id, v_mes);
  t := v_calc -> 'totales';
  select coalesce(max(version), 0) + 1 into v_version
  from cierres_mensuales where convenio_id = p_convenio_id and mes = v_mes;
  v_id := 'cie-' || p_convenio_id || '-' || to_char(v_mes, 'YYYY-MM') || '-v' || v_version;

  insert into cierres_mensuales (
    id, convenio_id, mes, version, estado, origen, corte,
    desembolsos_n, desembolsado, servicios, entregado,
    recaudos_n, recaudado, rec_capital, rec_interes, rec_mora, rec_gastos, rec_anticipo, rec_sin_desglose,
    flujo_neto, esperado,
    creditos_vigentes, saldo_capital, capital_vencido, creditos_en_mora, saldo_en_mora, saldo_par30, saldo_par90,
    cerrado_por, cerrado_por_nombre, notas)
  values (
    v_id, p_convenio_id, v_mes, v_version, 'cerrado', p_origen, (t->>'corte')::date,
    (t->>'desembolsos_n')::int, (t->>'desembolsado')::numeric, (t->>'servicios')::numeric, (t->>'entregado')::numeric,
    (t->>'recaudos_n')::int, (t->>'recaudado')::numeric, (t->>'rec_capital')::numeric, (t->>'rec_interes')::numeric,
    (t->>'rec_mora')::numeric, (t->>'rec_gastos')::numeric, (t->>'rec_anticipo')::numeric, (t->>'rec_sin_desglose')::numeric,
    (t->>'flujo_neto')::numeric, (t->>'esperado')::numeric,
    (t->>'creditos_vigentes')::int, (t->>'saldo_capital')::numeric, (t->>'capital_vencido')::numeric,
    (t->>'creditos_en_mora')::int, (t->>'saldo_en_mora')::numeric, (t->>'saldo_par30')::numeric, (t->>'saldo_par90')::numeric,
    p_usuario_id, p_usuario_nombre, p_notas);

  insert into cierre_creditos (cierre_id, credito_id, cliente_nombre, producto_nombre, fecha_desembolso,
    monto_desembolsado, saldo_capital, capital_vencido, cuotas_vencidas, dias_mora, categoria, recaudado_mes, desembolsado_mes)
  select v_id, k.credito_id, k.cliente_nombre, k.producto_nombre, k.fecha_desembolso,
    k.monto_desembolsado, k.saldo_capital, k.capital_vencido, k.cuotas_vencidas, k.dias_mora, k.categoria, k.recaudado_mes, k.desembolsado_mes
  from jsonb_to_recordset(v_calc -> 'creditos') as k(
    credito_id text, cliente_nombre text, producto_nombre text, fecha_desembolso date, monto_desembolsado numeric,
    saldo_capital numeric, capital_vencido numeric, cuotas_vencidas int, dias_mora int, categoria text,
    recaudado_mes numeric, desembolsado_mes numeric);

  insert into cierre_movimientos (cierre_id, fecha, tipo, credito_id, cliente_nombre, concepto, referencia, monto)
  select v_id, m.fecha, m.tipo, m.credito_id, m.cliente_nombre, m.concepto, m.referencia, m.monto
  from jsonb_to_recordset(v_calc -> 'movimientos') as m(
    fecha date, tipo text, credito_id text, cliente_nombre text, concepto text, referencia text, monto numeric);

  insert into audit_log (fecha, actor, accion, tabla, registro_id, datos)
  values (now(), coalesce(p_usuario_nombre, 'sistema'), 'CIERRE', 'cierres_mensuales', v_id, t);

  return v_id;
end $$;
revoke all on function public.fn_registrar_cierre(text, date, text, text, text, text) from public;
revoke all on function public.fn_calcular_cierre(text, date) from public;

-- ─── 5. Cerrar y reabrir (web) ─────────────────────────────────
create or replace function public.cerrar_mes(p_convenio_id text, p_mes date, p_notas text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u usuarios%rowtype;
  v_mes  date := date_trunc('month', p_mes)::date;
  v_fin  date := (date_trunc('month', p_mes) + interval '1 month - 1 day')::date;
  v_prev date := (date_trunc('month', p_mes) - interval '1 month')::date;
  v_id text;
begin
  u := public.fn_usuario_actual();
  if u.id is null or not public.fn_permiso_actual('cierre', 'editar') then
    raise exception 'Tu rol no tiene permiso para cerrar meses';
  end if;
  if not exists (select 1 from convenios where id = p_convenio_id and organizacion_id = u.organizacion_id) then
    raise exception 'Convenio % no encontrado', p_convenio_id;
  end if;
  if v_fin >= current_date then
    raise exception 'El mes % aún no termina; solo se cierran meses vencidos', to_char(v_mes, 'YYYY-MM');
  end if;
  -- serializa cierres del mismo convenio
  perform pg_advisory_xact_lock(hashtext('cierre:' || p_convenio_id));
  if exists (select 1 from cierres_mensuales where convenio_id = p_convenio_id and mes = v_mes and estado = 'cerrado') then
    raise exception 'El mes % ya está cerrado', to_char(v_mes, 'YYYY-MM');
  end if;
  if exists (select 1 from creditos where convenio_id = p_convenio_id
             and fecha_desembolso < v_mes)
     and not exists (select 1 from cierres_mensuales where convenio_id = p_convenio_id and mes = v_prev and estado = 'cerrado') then
    raise exception 'Cierra primero %: los meses se cierran en orden', to_char(v_prev, 'YYYY-MM');
  end if;

  v_id := public.fn_registrar_cierre(p_convenio_id, v_mes, 'manual', u.id, u.nombre, nullif(trim(coalesce(p_notas, '')), ''));
  return jsonb_build_object('cierre_id', v_id, 'mes', v_mes);
end $$;

create or replace function public.reabrir_mes(p_convenio_id text, p_mes date, p_motivo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u usuarios%rowtype;
  v_mes date := date_trunc('month', p_mes)::date;
  v_id text; v_posterior date;
begin
  u := public.fn_usuario_actual();
  if u.id is null or u.rol <> 'administrador' then
    raise exception 'Solo el Administrador puede reabrir un mes cerrado';
  end if;
  if not exists (select 1 from convenios where id = p_convenio_id and organizacion_id = u.organizacion_id) then
    raise exception 'Convenio % no encontrado', p_convenio_id;
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Indica el motivo de la reapertura (mínimo 10 caracteres)';
  end if;
  perform pg_advisory_xact_lock(hashtext('cierre:' || p_convenio_id));
  select id into v_id from cierres_mensuales
  where convenio_id = p_convenio_id and mes = v_mes and estado = 'cerrado' for update;
  if v_id is null then raise exception 'El mes % no está cerrado', to_char(v_mes, 'YYYY-MM'); end if;
  select min(mes) into v_posterior from cierres_mensuales
  where convenio_id = p_convenio_id and mes > v_mes and estado = 'cerrado';
  if v_posterior is not null then
    raise exception 'Reabre primero el último mes cerrado (% en adelante)', to_char(v_posterior, 'YYYY-MM');
  end if;

  update cierres_mensuales set estado = 'reabierto', reabierto_por = u.id, reabierto_por_nombre = u.nombre,
    reabierto_en = now(), motivo_reapertura = trim(p_motivo)
  where id = v_id;
  insert into audit_log (fecha, actor, accion, tabla, registro_id, datos)
  values (now(), u.nombre, 'REAPERTURA', 'cierres_mensuales', v_id, jsonb_build_object('motivo', trim(p_motivo)));
  return jsonb_build_object('cierre_id', v_id, 'estado', 'reabierto');
end $$;

grant execute on function public.vista_previa_cierre(text, date) to authenticated;
grant execute on function public.cerrar_mes(text, date, text) to authenticated;
grant execute on function public.reabrir_mes(text, date, text) to authenticated;

-- ─── 6. Bloqueo de períodos cerrados ───────────────────────────
create or replace function public.fn_mes_cerrado(p_convenio_id text, p_fecha date)
returns boolean language sql stable security definer set search_path = public as $$
  select p_convenio_id is not null and p_fecha is not null and exists (
    select 1 from cierres_mensuales
    where convenio_id = p_convenio_id and mes = date_trunc('month', p_fecha)::date and estado = 'cerrado')
$$;

-- cobranzas y pagos (credito_id + fecha)
create or replace function public.fn_bloquear_mes_cerrado_mov() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_conv text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select convenio_id into v_conv from creditos where id = old.credito_id;
    if public.fn_mes_cerrado(v_conv, old.fecha) then
      raise exception 'El mes % del convenio está cerrado: no se pueden modificar sus movimientos. Pide al Administrador reabrir el cierre.',
        to_char(old.fecha, 'YYYY-MM');
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select convenio_id into v_conv from creditos where id = new.credito_id;
    if public.fn_mes_cerrado(v_conv, new.fecha) then
      raise exception 'El mes % del convenio está cerrado: registra el pago con una fecha del período abierto o pide al Administrador reabrir el cierre.',
        to_char(new.fecha, 'YYYY-MM');
    end if;
    return new;
  end if;
  return old;
end $$;
drop trigger if exists trg_bloquear_mes_cerrado on public.cobranzas;
create trigger trg_bloquear_mes_cerrado before insert or update or delete on public.cobranzas
  for each row execute function public.fn_bloquear_mes_cerrado_mov();
drop trigger if exists trg_bloquear_mes_cerrado on public.pagos;
create trigger trg_bloquear_mes_cerrado before insert or update or delete on public.pagos
  for each row execute function public.fn_bloquear_mes_cerrado_mov();

-- desembolsos (creditos.fecha_desembolso / montos / convenio)
create or replace function public.fn_bloquear_mes_cerrado_credito() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if public.fn_mes_cerrado(new.convenio_id, new.fecha_desembolso) then
      raise exception 'El mes % del convenio está cerrado: no se puede registrar un desembolso con esa fecha.',
        to_char(new.fecha_desembolso, 'YYYY-MM');
    end if;
    return new;
  end if;
  if (new.fecha_desembolso, new.monto_desembolsado, new.monto_entregado, new.convenio_id)
     is distinct from (old.fecha_desembolso, old.monto_desembolsado, old.monto_entregado, old.convenio_id) then
    if public.fn_mes_cerrado(old.convenio_id, old.fecha_desembolso)
       or public.fn_mes_cerrado(new.convenio_id, new.fecha_desembolso) then
      raise exception 'El desembolso pertenece a un mes cerrado: no se puede modificar su fecha, monto o convenio.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_bloquear_mes_cerrado on public.creditos;
create trigger trg_bloquear_mes_cerrado before insert or update on public.creditos
  for each row execute function public.fn_bloquear_mes_cerrado_credito();

-- ─── 7. Versionado del cronograma antes de reprogramar ─────────
create or replace function public.fn_reprogramar_tras_anticipo(p_credito_id text) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  c creditos%rowtype; q record;
  v_n int; v_i int := 0; v_r numeric; v_saldo numeric; v_cuota numeric; v_int numeric; v_cap numeric; v_cuo numeric;
begin
  select * into c from creditos where id = p_credito_id;
  if exists (select 1 from cronograma_cuotas where credito_id = c.id and estado <> 'pagada' and monto_pagado > 0) then
    raise exception 'No se puede recalcular: hay cuotas parcialmente pagadas';
  end if;

  -- Copia del cronograma vigente antes de reescribirlo
  insert into cronograma_versiones (credito_id, version, motivo, saldo_capital, cuota_actual, cuotas, creado_por)
  select c.id,
         coalesce((select max(version) from cronograma_versiones where credito_id = c.id), 0) + 1,
         'anticipo',
         (select coalesce(sum(capital - capital_pagado), 0) from cronograma_cuotas where credito_id = c.id and estado <> 'pagada'),
         c.cuota_actual,
         (select coalesce(jsonb_agg(to_jsonb(x) - 'credito_id' order by x.num), '[]'::jsonb) from cronograma_cuotas x where x.credito_id = c.id),
         coalesce((public.fn_usuario_actual()).nombre, 'sistema');

  select count(*) into v_n from cronograma_cuotas where credito_id = c.id and estado <> 'pagada';
  v_saldo := c.saldo_capital;
  if v_n = 0 then return 0; end if;
  if v_saldo <= 0 then
    delete from cronograma_cuotas where credito_id = c.id and estado <> 'pagada';
    update creditos set cuota_actual = 0,
      cuotas_total = (select count(*) from cronograma_cuotas where credito_id = c.id)
    where id = c.id;
    return 0;
  end if;

  v_r := c.tasa_nominal_anual / 100.0 / public.fn_periodos_anio(c.frecuencia);
  v_cuota := public.fn_cuota_frances(v_saldo, v_r, v_n);
  for q in select * from cronograma_cuotas where credito_id = c.id and estado <> 'pagada' order by num loop
    v_i := v_i + 1;
    v_int := round(v_saldo * v_r);
    v_cap := v_cuota - v_int;
    v_cuo := v_cuota;
    if v_i = v_n then v_cap := v_saldo; v_cuo := v_cap + v_int; end if;
    v_saldo := greatest(0, v_saldo - v_cap);
    update cronograma_cuotas set cuota = v_cuo, capital = v_cap, interes = v_int, saldo_posterior = v_saldo
    where id = q.id;
  end loop;
  update creditos set cuota_actual = v_cuota where id = c.id;
  return v_cuota;
end $$;
revoke all on function public.fn_reprogramar_tras_anticipo(text) from public;

-- ─── 8. Reconstrucción del histórico ───────────────────────────
-- Cierra como 'reconstruido' cada mes desde el primer desembolso del
-- convenio hasta agosto 2026. Septiembre 2026 queda abierto a propósito:
-- terminó hace días y puede tener pagos aún por registrar; se cierra
-- desde la web cuando cobranza confirme que está conciliado.
do $$
declare cv record; v_mes date; v_hasta date := date '2026-08-01';
begin
  for cv in
    select convenio_id, date_trunc('month', min(fecha_desembolso))::date as desde
    from creditos where fecha_desembolso is not null group by convenio_id
  loop
    v_mes := cv.desde;
    while v_mes <= v_hasta loop
      if not exists (select 1 from cierres_mensuales where convenio_id = cv.convenio_id and mes = v_mes) then
        perform public.fn_registrar_cierre(cv.convenio_id, v_mes, 'reconstruido', null, 'Sistema (reconstrucción)',
          'Reconstruido el ' || to_char(current_date, 'YYYY-MM-DD') || ' a partir de cuotas, pagos y cobranzas registrados.');
      end if;
      v_mes := (v_mes + interval '1 month')::date;
    end loop;
  end loop;
end $$;
