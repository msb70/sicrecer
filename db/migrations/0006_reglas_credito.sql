-- ─────────────────────────────────────────────────────────────
-- 0006 · Reglas de crédito acordadas con SiCrecer (2026-09-28)
--
--  1. Cuota fija (sistema francés).
--  2. Servicios de desarrollo empresarial: % configurable por producto,
--     se descuenta del monto prestado al desembolsar (el cliente debe el
--     monto total y recibe monto − servicios).
--  3. Mora: % por período del producto, sobre capital vencido, después de
--     los días de gracia, siempre por período completo.
--  4. Gastos administrativos: % por período del producto, sobre capital
--     vencido, mientras existan cuotas vencidas.
--  5. Orden de aplicación de pagos: gastos administrativos → mora →
--     interés → capital.
--  6. Pago mayor a la cuota = anticipo a capital (solo sin cuotas
--     vencidas); se recalcula la cuota manteniendo el plazo restante.
--  7. Periodicidad mensual / quincenal / semanal. Tasa por período:
--     anual/12, anual/24, anual/52. Convención 30/360 (período = 30/15/7 días).
--  8. Plazos permitidos, monto mínimo y máximo por producto.
--  9. Primera cuota: un período después de la fecha de desembolso.
-- Condonación: fuera de alcance (fase posterior).
-- ─────────────────────────────────────────────────────────────

-- ─── Producto: configuración de reglas ───────────────────────
alter table productos_credito
  add column if not exists pct_servicios numeric not null default 0
    check (pct_servicios >= 0 and pct_servicios < 100),
  add column if not exists pct_mora_periodo numeric not null default 0
    check (pct_mora_periodo >= 0),
  add column if not exists pct_gastos_admin_periodo numeric not null default 0
    check (pct_gastos_admin_periodo >= 0),
  add column if not exists dias_gracia_mora int not null default 0
    check (dias_gracia_mora >= 0),
  add column if not exists plazos_permitidos int[] not null default '{}';

comment on column productos_credito.pct_servicios is '% servicios de desarrollo empresarial, descontado del monto al desembolsar';
comment on column productos_credito.pct_mora_periodo is '% de mora por período del producto, sobre capital vencido';
comment on column productos_credito.pct_gastos_admin_periodo is '% de gastos administrativos por período, sobre capital vencido';
comment on column productos_credito.dias_gracia_mora is 'Días después del vencimiento antes de cobrar mora y gastos administrativos';
comment on column productos_credito.plazos_permitidos is 'Plazos (en cuotas) permitidos. Vacío = cualquier plazo entre plazo_min y plazo_max';
comment on column productos_credito.periodo_gracia_dias is 'OBSOLETO desde 0006: la primera cuota vence un período después del desembolso. Usar dias_gracia_mora.';

-- Todos los productos pasan a cuota fija (francés). Los créditos ya
-- desembolsados conservan su propio metodo_interes.
update productos_credito set metodo_interes = 'declining_balance' where metodo_interes <> 'declining_balance';

-- plazo_min / plazo_max se sincronizan con la lista de plazos permitidos
create or replace function public.fn_sync_plazos_producto() returns trigger
language plpgsql as $$
begin
  if cardinality(coalesce(new.plazos_permitidos, '{}')) > 0 then
    select array_agg(distinct x order by x) into new.plazos_permitidos
    from unnest(new.plazos_permitidos) x where x > 0;
    new.plazo_min := new.plazos_permitidos[1];
    new.plazo_max := new.plazos_permitidos[cardinality(new.plazos_permitidos)];
  end if;
  return new;
end $$;
drop trigger if exists trg_sync_plazos on productos_credito;
create trigger trg_sync_plazos before insert or update on productos_credito
  for each row execute function public.fn_sync_plazos_producto();

create or replace function public.fn_plazo_valido(p productos_credito, p_plazo int) returns boolean
language sql immutable as $$
  select case
    when cardinality(coalesce(p.plazos_permitidos, '{}')) > 0 then p_plazo = any(p.plazos_permitidos)
    else p_plazo between coalesce(p.plazo_min, 1) and coalesce(p.plazo_max, 100000)
  end
$$;

-- Validación de plazo permitido en solicitudes (internas y externas,
-- plazo solicitado y plazo aprobado por comité)
create or replace function public.fn_validar_plazo_solicitud() returns trigger
language plpgsql security definer set search_path = public as $$
declare p productos_credito%rowtype;
begin
  select * into p from productos_credito where id = new.producto_id;
  if not found then return new; end if;
  if (tg_op = 'INSERT' or new.plazo is distinct from old.plazo) and not public.fn_plazo_valido(p, new.plazo) then
    raise exception 'Plazo de % cuotas no permitido para el producto % (permitidos: %)', new.plazo, p.nombre,
      case when cardinality(p.plazos_permitidos) > 0 then array_to_string(p.plazos_permitidos, ', ')
           else p.plazo_min || ' – ' || p.plazo_max end;
  end if;
  if new.plazo_aprobado is not null and (tg_op = 'INSERT' or new.plazo_aprobado is distinct from old.plazo_aprobado)
     and not public.fn_plazo_valido(p, new.plazo_aprobado) then
    raise exception 'Plazo aprobado de % cuotas no permitido para el producto %', new.plazo_aprobado, p.nombre;
  end if;
  return new;
end $$;
drop trigger if exists trg_validar_plazo on solicitudes;
create trigger trg_validar_plazo before insert or update on solicitudes
  for each row execute function public.fn_validar_plazo_solicitud();

-- ─── Créditos: condiciones congeladas al desembolso ──────────
alter table creditos
  add column if not exists solicitud_id text references solicitudes(id),
  add column if not exists pct_servicios numeric not null default 0,
  add column if not exists monto_servicios numeric not null default 0,
  add column if not exists monto_entregado numeric,
  add column if not exists pct_mora_periodo numeric not null default 0,
  add column if not exists pct_gastos_admin_periodo numeric not null default 0,
  add column if not exists dias_gracia_mora int not null default 0,
  add column if not exists cuota_actual numeric;
update creditos set monto_entregado = monto_desembolsado where monto_entregado is null;
create unique index if not exists uq_creditos_solicitud on creditos (solicitud_id) where solicitud_id is not null;
comment on column creditos.monto_desembolsado is 'Monto del crédito: capital adeudado (incluye servicios). Lo entregado en efectivo está en monto_entregado.';
comment on column creditos.monto_entregado is 'Efectivo entregado al cliente = monto_desembolsado − monto_servicios';

-- ─── Cronograma: pagado por componente ───────────────────────
alter table cronograma_cuotas
  add column if not exists interes_pagado numeric not null default 0 check (interes_pagado >= 0),
  add column if not exists capital_pagado numeric not null default 0 check (capital_pagado >= 0);
update cronograma_cuotas
set interes_pagado = least(monto_pagado, interes),
    capital_pagado = monto_pagado - least(monto_pagado, interes)
where monto_pagado > 0 and interes_pagado = 0 and capital_pagado = 0;

-- ─── Pagos: desglose por concepto ────────────────────────────
alter table pagos
  add column if not exists monto_gastos numeric not null default 0,
  add column if not exists monto_mora numeric not null default 0,
  add column if not exists tipo text not null default 'cuota' check (tipo in ('cuota','cargos','anticipo')),
  add column if not exists cobranza_id text;
comment on column pagos.cuota_num is 'Número de cuota; 0 para cargos por atraso y anticipos a capital';

-- ─── Cargos por atraso (gastos administrativos y mora) ───────
create table if not exists cargos_atraso (
  id bigint generated always as identity primary key,
  credito_id text not null references creditos(id),
  cuota_num int not null,
  tipo text not null check (tipo in ('gastos_admin','mora')),
  periodo int not null check (periodo > 0),
  fecha date not null,
  base_capital numeric not null check (base_capital >= 0),
  porcentaje numeric not null,
  monto numeric not null check (monto > 0),
  monto_pagado numeric not null default 0 check (monto_pagado >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente','pagado')),
  creado_en timestamptz not null default now(),
  unique (credito_id, cuota_num, tipo, periodo)
);
create index if not exists idx_cargos_credito_estado on cargos_atraso (credito_id, estado);
alter table cargos_atraso enable row level security;
grant select on cargos_atraso to authenticated;
drop policy if exists sel_whitelist on cargos_atraso;
create policy sel_whitelist on cargos_atraso for select to authenticated using (public.fn_rol_actual() is not null);
drop trigger if exists trg_audit on cargos_atraso;
create trigger trg_audit after insert or update or delete on cargos_atraso
  for each row execute function public.fn_audit();

-- ─── Helpers financieros ─────────────────────────────────────
create or replace function public.fn_periodos_anio(p_frecuencia text) returns int
language sql immutable as $$
  select case p_frecuencia when 'semanal' then 52 when 'quincenal' then 24 else 12 end
$$;

-- Convención 30/360: días por período
create or replace function public.fn_dias_periodo(p_frecuencia text) returns int
language sql immutable as $$
  select case p_frecuencia when 'semanal' then 7 when 'quincenal' then 15 else 30 end
$$;

create or replace function public.fn_cuota_frances(p_monto numeric, p_r numeric, p_n int) returns numeric
language sql immutable as $$
  select case when p_n <= 0 then 0
              when p_r = 0 then round(p_monto / p_n)
              else round(p_monto * (p_r * power(1 + p_r, p_n)) / (power(1 + p_r, p_n) - 1)) end
$$;

-- ─── Generación de cronograma (primera cuota = desembolso + 1 período) ──
create or replace function public.generar_cronograma(p_credito_id text) returns void
language plpgsql security definer set search_path = public as $$
declare
  c creditos%rowtype;
  v_paso interval; v_r numeric;
  v_cuota numeric; v_cuota_fila numeric; v_saldo numeric; v_interes numeric; v_capital numeric; v_fecha date; n int;
begin
  select * into c from creditos where id = p_credito_id;
  if not found then raise exception 'Crédito % no existe', p_credito_id; end if;
  if c.tasa_nominal_anual is null or c.metodo_interes is null or c.frecuencia is null then
    raise exception 'Crédito % sin tasa/método/frecuencia', p_credito_id;
  end if;
  if c.fecha_desembolso is null then raise exception 'Crédito % sin fecha de desembolso', p_credito_id; end if;
  if exists (select 1 from cronograma_cuotas q where q.credito_id = p_credito_id and q.monto_pagado > 0 and q.num > c.cuotas_pagadas) then
    raise exception 'El crédito % tiene pagos aplicados; no se puede regenerar el cronograma', p_credito_id;
  end if;
  delete from cronograma_cuotas where credito_id = p_credito_id;

  v_paso := case c.frecuencia when 'semanal' then interval '7 days' when 'quincenal' then interval '15 days' else interval '1 month' end;
  v_r := c.tasa_nominal_anual / 100.0 / public.fn_periodos_anio(c.frecuencia);

  if c.metodo_interes = 'flat' then   -- solo créditos heredados
    v_cuota := round((c.monto_desembolsado + c.monto_desembolsado * v_r * c.cuotas_total) / c.cuotas_total);
  else
    v_cuota := public.fn_cuota_frances(c.monto_desembolsado, v_r, c.cuotas_total);
  end if;

  v_saldo := c.monto_desembolsado;
  for n in 1..c.cuotas_total loop
    v_fecha := (c.fecha_desembolso + (v_paso * n))::date;
    v_interes := case when c.metodo_interes = 'flat' then round(c.monto_desembolsado * v_r) else round(v_saldo * v_r) end;
    v_capital := v_cuota - v_interes;
    v_cuota_fila := v_cuota;
    if n = c.cuotas_total then v_capital := v_saldo; v_cuota_fila := v_capital + v_interes; end if;
    v_saldo := greatest(0, v_saldo - v_capital);
    insert into cronograma_cuotas (credito_id, num, fecha_vencimiento, cuota, capital, interes, saldo_posterior,
                                   monto_pagado, interes_pagado, capital_pagado, estado, pagada_en)
    values (c.id, n, v_fecha, v_cuota_fila, v_capital, v_interes, v_saldo,
            case when n <= c.cuotas_pagadas then v_cuota_fila else 0 end,
            case when n <= c.cuotas_pagadas then v_interes else 0 end,
            case when n <= c.cuotas_pagadas then v_capital else 0 end,
            case when n <= c.cuotas_pagadas then 'pagada' when v_fecha < current_date then 'vencida' else 'pendiente' end,
            case when n <= c.cuotas_pagadas then v_fecha end);
  end loop;

  update creditos set cuota_actual = v_cuota,
    proxima_cuota = (select min(fecha_vencimiento) from cronograma_cuotas where credito_id = c.id and estado <> 'pagada')
  where id = c.id;
end $$;

-- ─── Cargos por atraso ───────────────────────────────────────
-- Por cada cuota con capital vencido: pasados los días de gracia se cobra
-- mora y gastos administrativos por cada período (completo) de atraso,
-- sobre el capital vencido de esa cuota. Idempotente.
create or replace function public.fn_generar_cargos(p_credito_id text, p_fecha date default current_date) returns int
language plpgsql security definer set search_path = public as $$
declare
  c creditos%rowtype; q record;
  v_dp int; v_dias int; v_k int; v_p int; v_base numeric; v_monto numeric; v_n int := 0; v_filas int;
begin
  select * into c from creditos where id = p_credito_id;
  if not found or c.estado in ('cancelado', 'castigado') then return 0; end if;
  if c.pct_mora_periodo = 0 and c.pct_gastos_admin_periodo = 0 then return 0; end if;
  v_dp := public.fn_dias_periodo(c.frecuencia);

  for q in select * from cronograma_cuotas
           where credito_id = c.id and estado <> 'pagada' and fecha_vencimiento < p_fecha and capital > capital_pagado
           order by num loop
    v_dias := p_fecha - q.fecha_vencimiento;
    continue when v_dias <= c.dias_gracia_mora;
    v_k := ceil(v_dias::numeric / v_dp)::int;
    v_base := q.capital - q.capital_pagado;
    for v_p in 1..v_k loop
      if c.pct_gastos_admin_periodo > 0 then
        v_monto := round(v_base * c.pct_gastos_admin_periodo / 100);
        if v_monto > 0 then
          insert into cargos_atraso (credito_id, cuota_num, tipo, periodo, fecha, base_capital, porcentaje, monto)
          values (c.id, q.num, 'gastos_admin', v_p, q.fecha_vencimiento + (v_p - 1) * v_dp, v_base, c.pct_gastos_admin_periodo, v_monto)
          on conflict (credito_id, cuota_num, tipo, periodo) do nothing;
          get diagnostics v_filas = row_count; v_n := v_n + v_filas;
        end if;
      end if;
      if c.pct_mora_periodo > 0 then
        v_monto := round(v_base * c.pct_mora_periodo / 100);
        if v_monto > 0 then
          insert into cargos_atraso (credito_id, cuota_num, tipo, periodo, fecha, base_capital, porcentaje, monto)
          values (c.id, q.num, 'mora', v_p, q.fecha_vencimiento + (v_p - 1) * v_dp, v_base, c.pct_mora_periodo, v_monto)
          on conflict (credito_id, cuota_num, tipo, periodo) do nothing;
          get diagnostics v_filas = row_count; v_n := v_n + v_filas;
        end if;
      end if;
    end loop;
  end loop;
  return v_n;
end $$;

-- ─── Recalcular cuotas pendientes tras un anticipo ───────────
-- Mantiene el número de cuotas restantes y sus fechas; recalcula la cuota
-- fija sobre el capital pendiente. Si el capital queda en cero, elimina las
-- cuotas restantes (el audit_log conserva el historial).
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
  select count(*), coalesce(sum(capital), 0) into v_n, v_saldo
  from cronograma_cuotas where credito_id = c.id and estado <> 'pagada';
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

-- ─── Estado del crédito (derivado del cronograma y cargos) ───
create or replace function public.fn_actualizar_estado_credito(p_credito_id text) returns void
language plpgsql security definer set search_path = public as $$
declare v_pagadas int; v_total int; v_prox date; v_mora int; v_saldo numeric; v_cargos numeric; v_vencidas int; v_estado_ant text;
begin
  select estado into v_estado_ant from creditos where id = p_credito_id;
  update cronograma_cuotas set estado = 'vencida'
  where credito_id = p_credito_id and estado in ('pendiente', 'parcial') and fecha_vencimiento < current_date;
  select count(*) filter (where estado = 'pagada'), count(*),
         min(fecha_vencimiento) filter (where estado <> 'pagada'),
         coalesce(sum(capital - capital_pagado) filter (where estado <> 'pagada'), 0),
         count(*) filter (where estado = 'vencida')
    into v_pagadas, v_total, v_prox, v_saldo, v_vencidas
  from cronograma_cuotas where credito_id = p_credito_id;
  v_mora := coalesce((select current_date - min(fecha_vencimiento) from cronograma_cuotas
                      where credito_id = p_credito_id and estado <> 'pagada' and fecha_vencimiento < current_date), 0);
  select coalesce(sum(monto - monto_pagado), 0) into v_cargos from cargos_atraso
  where credito_id = p_credito_id and estado = 'pendiente';

  update creditos set
    saldo_capital = v_saldo,
    cuotas_pagadas = v_pagadas,
    cuotas_total = v_total,
    proxima_cuota = v_prox,
    dias_mora = greatest(v_mora, 0),
    estado = case
      when estado = 'castigado' then 'castigado'
      when v_pagadas >= v_total and v_saldo = 0 and v_cargos = 0 then 'cancelado'
      when v_vencidas > 0 or v_cargos > 0 then 'en_mora'
      else 'al_dia' end
  where id = p_credito_id;

  if v_estado_ant <> 'cancelado' and (select estado from creditos where id = p_credito_id) = 'cancelado' then
    update clientes set creditos_activos = greatest(0, creditos_activos - 1)
    where id = (select cliente_id from creditos where id = p_credito_id);
  end if;
end $$;

-- ─── Desembolso de una solicitud aprobada ────────────────────
create or replace function public.desembolsar_solicitud(
  p_solicitud_id text, p_fecha_desembolso date default current_date
) returns jsonb
language plpgsql security definer set search_path = public, neon_auth, auth as $$
declare
  v_u usuarios; v_s solicitudes%rowtype; p productos_credito%rowtype; v_st solicitantes%rowtype;
  v_existente text; v_id text; v_monto numeric; v_plazo int; v_serv numeric; v_entregado numeric; v_cuota numeric; v_primera date;
begin
  v_u := public.fn_usuario_actual();
  if v_u.id is null or v_u.rol not in ('administrador', 'coordinador') then
    raise exception 'Solo administrador o coordinador pueden registrar desembolsos';
  end if;
  if p_fecha_desembolso is null then raise exception 'La fecha de desembolso es obligatoria'; end if;

  select * into v_s from solicitudes where id = p_solicitud_id for update;
  if not found then raise exception 'Solicitud % no existe', p_solicitud_id; end if;

  select id into v_existente from creditos where solicitud_id = p_solicitud_id;
  if found then return jsonb_build_object('duplicado', true, 'credito_id', v_existente); end if;

  if v_s.estado not in ('aprobada', 'firma') then
    raise exception 'Solo se desembolsan solicitudes aprobadas (estado actual: %)', v_s.estado;
  end if;
  if v_s.cliente_id is null then raise exception 'La solicitud no tiene cliente asociado'; end if;

  select * into p from productos_credito where id = v_s.producto_id;
  if not found then raise exception 'Producto % no existe', v_s.producto_id; end if;

  v_monto := coalesce(v_s.monto_aprobado, v_s.monto_solicitado);
  v_plazo := coalesce(v_s.plazo_aprobado, v_s.plazo);
  if v_monto < coalesce(p.monto_min, 0) or v_monto > coalesce(p.monto_max, v_monto) then
    raise exception 'Monto % fuera del rango del producto (% – %)', v_monto, p.monto_min, p.monto_max;
  end if;
  if not public.fn_plazo_valido(p, v_plazo) then
    raise exception 'Plazo de % cuotas no permitido para el producto', v_plazo;
  end if;

  v_serv := round(v_monto * p.pct_servicios / 100);
  v_entregado := v_monto - v_serv;
  v_id := 'cred-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');

  insert into creditos (id, cliente_id, cliente_nombre, producto_nombre, convenio_id, fecha_desembolso,
                        monto_desembolsado, saldo_capital, cuotas_total, cuotas_pagadas, dias_mora, estado,
                        producto_id, tasa_nominal_anual, metodo_interes, frecuencia, solicitud_id,
                        pct_servicios, monto_servicios, monto_entregado,
                        pct_mora_periodo, pct_gastos_admin_periodo, dias_gracia_mora)
  values (v_id, v_s.cliente_id, v_s.cliente_nombre, p.nombre, p.convenio_id, p_fecha_desembolso,
          v_monto, v_monto, v_plazo, 0, 0, 'al_dia',
          p.id, p.tasa_nominal_anual, 'declining_balance', p.frecuencia, v_s.id,
          p.pct_servicios, v_serv, v_entregado,
          p.pct_mora_periodo, p.pct_gastos_admin_periodo, p.dias_gracia_mora);

  perform public.generar_cronograma(v_id);
  perform public.fn_actualizar_estado_credito(v_id);

  update solicitudes set estado = 'desembolsada' where id = v_s.id;
  update clientes set creditos_activos = creditos_activos + 1, total_prestado = total_prestado + v_monto
  where id = v_s.cliente_id;

  select cuota_actual, proxima_cuota into v_cuota, v_primera from creditos where id = v_id;

  if v_s.solicitante_id is not null then
    select * into v_st from solicitantes where id = v_s.solicitante_id;
    if found then
      insert into notificaciones (destinatario, asunto, cuerpo, tipo, referencia) values (
        v_st.email, '[SiCrecer] Tu crédito fue desembolsado',
        format('Hola %s,%s%sTu crédito %s fue desembolsado el %s.%sMonto del crédito: %s%sServicios de desarrollo empresarial (%s%%): %s%sMonto entregado: %s%sCuota: %s (%s), primera cuota el %s.',
               v_st.nombre, E'\n', E'\n', p.nombre, to_char(p_fecha_desembolso, 'DD/MM/YYYY'), E'\n',
               v_monto, E'\n', p.pct_servicios, v_serv, E'\n', v_entregado, E'\n', v_cuota, p.frecuencia, to_char(v_primera, 'DD/MM/YYYY')),
        'desembolso', v_id);
    end if;
  end if;

  return jsonb_build_object('credito_id', v_id, 'monto_credito', v_monto, 'monto_servicios', v_serv,
                            'monto_entregado', v_entregado, 'cuota', v_cuota, 'primera_cuota', v_primera,
                            'plazo', v_plazo);
end $$;

-- ─── Aplicación de pagos ─────────────────────────────────────
-- Orden: gastos administrativos → mora → (por cuota, de la más antigua)
-- interés → capital. Se cubren todas las cuotas vencidas y la cuota
-- corriente; el excedente es anticipo a capital y recalcula la cuota.
-- Un pago mayor al total para cancelar se rechaza.
-- Idempotente por clave_idempotencia.
drop function if exists public.aplicar_pago(text, numeric, text, text, date, text);
create or replace function public.aplicar_pago(
  p_credito_id text, p_monto numeric, p_banco text, p_numero_deposito text,
  p_fecha date default current_date, p_clave_idempotencia text default null,
  p_metodo text default 'transferencia'
) returns jsonb
language plpgsql security definer set search_path = public, neon_auth, auth as $$
declare
  v_usuario usuarios; v_credito creditos%rowtype; q record; g record;
  v_restante numeric; v_ab numeric; v_int numeric; v_cap numeric;
  v_gastos numeric := 0; v_mora numeric := 0; v_tot_int numeric := 0; v_tot_cap numeric := 0;
  v_anticipo numeric := 0; v_saldo numeric; v_cuota_nueva numeric;
  v_cuotas int[] := '{}'; v_cob_id text; v_dup text; v_corriente boolean := false;
begin
  v_usuario := public.fn_usuario_actual();
  if v_usuario.id is null then raise exception 'Usuario no autorizado para registrar pagos'; end if;
  if v_usuario.rol not in ('administrador', 'coordinador', 'facilitador') then
    raise exception 'El rol % no puede registrar pagos', v_usuario.rol;
  end if;
  if p_monto is null or p_monto <= 0 then raise exception 'El monto debe ser mayor que cero'; end if;
  if p_fecha is null or p_fecha > current_date then raise exception 'La fecha del pago no puede ser futura'; end if;
  if p_metodo not in ('efectivo', 'transferencia', 'pse') then raise exception 'Método de pago inválido'; end if;

  if p_clave_idempotencia is not null then
    select id into v_dup from cobranzas where clave_idempotencia = p_clave_idempotencia;
    if found then return jsonb_build_object('duplicado', true, 'cobranza_id', v_dup); end if;
  end if;

  select * into v_credito from creditos where id = p_credito_id for update;
  if not found then raise exception 'Crédito % no existe', p_credito_id; end if;
  if v_credito.estado in ('cancelado', 'castigado') then raise exception 'El crédito % está %', p_credito_id, v_credito.estado; end if;
  if not exists (select 1 from cronograma_cuotas where credito_id = p_credito_id) then
    raise exception 'El crédito % no tiene cronograma generado', p_credito_id;
  end if;

  perform public.fn_generar_cargos(p_credito_id, p_fecha);

  v_cob_id := 'cob-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
  v_restante := p_monto;

  -- 1-2. Gastos administrativos y luego mora
  for g in select * from cargos_atraso where credito_id = p_credito_id and estado = 'pendiente'
           order by case tipo when 'gastos_admin' then 1 else 2 end, fecha, cuota_num, id for update loop
    exit when v_restante <= 0;
    v_ab := least(v_restante, g.monto - g.monto_pagado);
    continue when v_ab <= 0;
    update cargos_atraso set monto_pagado = monto_pagado + v_ab,
      estado = case when monto_pagado + v_ab >= monto then 'pagado' else 'pendiente' end
    where id = g.id;
    if g.tipo = 'gastos_admin' then v_gastos := v_gastos + v_ab; else v_mora := v_mora + v_ab; end if;
    v_restante := v_restante - v_ab;
  end loop;
  if v_gastos + v_mora > 0 then
    insert into pagos (id, credito_id, cuota_num, fecha, monto_capital, monto_interes, monto_gastos, monto_mora,
                       monto_total, metodo, referencia, registrado_por, tipo, cobranza_id)
    values (v_cob_id || '-cargos', p_credito_id, 0, p_fecha, 0, 0, v_gastos, v_mora,
            v_gastos + v_mora, p_metodo, p_numero_deposito, v_usuario.nombre, 'cargos', v_cob_id);
  end if;

  -- 3-4. Cuotas: todas las vencidas y la corriente (interés → capital)
  for q in select * from cronograma_cuotas where credito_id = p_credito_id and estado <> 'pagada'
           order by num for update loop
    exit when v_restante <= 0;
    if q.fecha_vencimiento >= p_fecha then
      exit when v_corriente;       -- solo una cuota no vencida
      v_corriente := true;
    end if;
    v_int := least(v_restante, q.interes - q.interes_pagado);
    v_restante := v_restante - v_int;
    v_cap := least(v_restante, q.capital - q.capital_pagado);
    v_restante := v_restante - v_cap;
    continue when v_int + v_cap <= 0;
    update cronograma_cuotas set
      interes_pagado = interes_pagado + v_int,
      capital_pagado = capital_pagado + v_cap,
      monto_pagado = monto_pagado + v_int + v_cap,
      estado = case when monto_pagado + v_int + v_cap >= cuota then 'pagada'
                    when fecha_vencimiento < current_date then 'vencida' else 'parcial' end,
      pagada_en = case when monto_pagado + v_int + v_cap >= cuota then p_fecha else pagada_en end
    where id = q.id;
    insert into pagos (id, credito_id, cuota_num, fecha, monto_capital, monto_interes, monto_total,
                       metodo, referencia, registrado_por, tipo, cobranza_id)
    values (v_cob_id || '-c' || q.num, p_credito_id, q.num, p_fecha, v_cap, v_int, v_int + v_cap,
            p_metodo, p_numero_deposito, v_usuario.nombre, 'cuota', v_cob_id);
    v_tot_int := v_tot_int + v_int;
    v_tot_cap := v_tot_cap + v_cap;
    if q.monto_pagado + v_int + v_cap >= q.cuota then v_cuotas := v_cuotas || q.num; end if;
  end loop;

  -- 5. Excedente = anticipo a capital (ya no hay cuotas vencidas ni cargos pendientes)
  select coalesce(sum(capital - capital_pagado), 0) into v_saldo
  from cronograma_cuotas where credito_id = p_credito_id and estado <> 'pagada';
  if v_restante > 0 and v_saldo > 0 then
    v_anticipo := least(v_restante, v_saldo);
    v_restante := v_restante - v_anticipo;
    update creditos set saldo_capital = v_saldo - v_anticipo where id = p_credito_id;
    insert into pagos (id, credito_id, cuota_num, fecha, monto_capital, monto_interes, monto_total,
                       metodo, referencia, registrado_por, tipo, cobranza_id)
    values (v_cob_id || '-anticipo', p_credito_id, 0, p_fecha, v_anticipo, 0, v_anticipo,
            p_metodo, p_numero_deposito, v_usuario.nombre, 'anticipo', v_cob_id);
    v_cuota_nueva := public.fn_reprogramar_tras_anticipo(p_credito_id);
  end if;

  -- El pago no puede exceder el total para cancelar el crédito
  if v_restante > 0 then
    raise exception 'El pago excede en % el total para cancelar el crédito (%). Registre como máximo ese total.',
      v_restante, p_monto - v_restante;
  end if;

  perform public.fn_actualizar_estado_credito(p_credito_id);

  insert into cobranzas (id, cliente_id, cliente_nombre, credito_id, fecha, banco, numero_deposito, monto,
                         cuotas_aplicadas, creado_por, clave_idempotencia)
  values (v_cob_id, v_credito.cliente_id, v_credito.cliente_nombre, p_credito_id, p_fecha, p_banco,
          p_numero_deposito, p_monto, v_cuotas, v_usuario.id, p_clave_idempotencia);

  return jsonb_build_object(
    'cobranza_id', v_cob_id,
    'monto_recibido', p_monto,
    'gastos_admin', v_gastos,
    'mora', v_mora,
    'interes', v_tot_int,
    'capital', v_tot_cap,
    'anticipo', v_anticipo,
    'excedente', v_restante,
    'cuotas_completadas', v_cuotas,
    'cuota_nueva', v_cuota_nueva,
    'saldo_capital', (select saldo_capital from creditos where id = p_credito_id),
    'estado_credito', (select estado from creditos where id = p_credito_id)
  );
end $$;

-- ─── Simulación de pago (misma lógica, sin persistir) ────────
create or replace function public.simular_pago(
  p_credito_id text, p_monto numeric, p_fecha date default current_date
) returns jsonb
language plpgsql security definer set search_path = public, neon_auth, auth as $$
declare v jsonb; v_det text;
begin
  begin
    v := public.aplicar_pago(p_credito_id, p_monto, 'simulacion', 'simulacion', p_fecha, null, 'transferencia');
    raise exception using message = '__SIMULACION__', detail = v::text;
  exception when others then
    if sqlerrm = '__SIMULACION__' then
      get stacked diagnostics v_det = pg_exception_detail;
      return v_det::jsonb;
    end if;
    raise;
  end;
end $$;

-- ─── Estado de cuenta (genera cargos al día y devuelve todo) ──
create or replace function public.estado_cuenta(p_credito_id text, p_fecha date default current_date) returns jsonb
language plpgsql security definer set search_path = public, neon_auth, auth as $$
declare c creditos%rowtype; v_cuotas jsonb; v_cargos jsonb; v_pagos jsonb; v_resumen jsonb; v_corr int;
begin
  if public.fn_rol_actual() is null and session_user in ('authenticated', 'anonymous', 'authenticator') then
    raise exception 'No autorizado';
  end if;
  select * into c from creditos where id = p_credito_id;
  if not found then raise exception 'Crédito % no existe', p_credito_id; end if;
  if c.estado not in ('cancelado', 'castigado') then
    perform public.fn_generar_cargos(p_credito_id, p_fecha);
    perform public.fn_actualizar_estado_credito(p_credito_id);
    select * into c from creditos where id = p_credito_id;
  end if;

  select min(num) into v_corr from cronograma_cuotas
  where credito_id = c.id and estado <> 'pagada' and fecha_vencimiento >= p_fecha;

  select coalesce(jsonb_agg(to_jsonb(q) order by q.num), '[]') into v_cuotas
  from cronograma_cuotas q where q.credito_id = c.id;
  select coalesce(jsonb_agg(to_jsonb(g) order by g.fecha, g.cuota_num, g.tipo), '[]') into v_cargos
  from cargos_atraso g where g.credito_id = c.id;
  select coalesce(jsonb_agg(to_jsonb(p) order by p.fecha desc, p.id), '[]') into v_pagos
  from pagos p where p.credito_id = c.id;

  select jsonb_build_object(
    'fecha', p_fecha,
    'gastos_pendientes', coalesce((select sum(monto - monto_pagado) from cargos_atraso where credito_id = c.id and estado = 'pendiente' and tipo = 'gastos_admin'), 0),
    'mora_pendiente', coalesce((select sum(monto - monto_pagado) from cargos_atraso where credito_id = c.id and estado = 'pendiente' and tipo = 'mora'), 0),
    'interes_vencido', coalesce((select sum(interes - interes_pagado) from cronograma_cuotas where credito_id = c.id and estado <> 'pagada' and fecha_vencimiento < p_fecha), 0),
    'capital_vencido', coalesce((select sum(capital - capital_pagado) from cronograma_cuotas where credito_id = c.id and estado <> 'pagada' and fecha_vencimiento < p_fecha), 0),
    'cuota_corriente_num', v_corr,
    'cuota_corriente_pendiente', coalesce((select cuota - monto_pagado from cronograma_cuotas where credito_id = c.id and num = v_corr), 0),
    'capital_posterior', coalesce((select sum(capital - capital_pagado) from cronograma_cuotas where credito_id = c.id and estado <> 'pagada' and fecha_vencimiento >= p_fecha and num <> coalesce(v_corr, -1)), 0)
  ) into v_resumen;
  v_resumen := v_resumen || jsonb_build_object(
    'total_para_ponerse_al_dia', (v_resumen->>'gastos_pendientes')::numeric + (v_resumen->>'mora_pendiente')::numeric
                                 + (v_resumen->>'interes_vencido')::numeric + (v_resumen->>'capital_vencido')::numeric,
    'total_para_cancelar', (v_resumen->>'gastos_pendientes')::numeric + (v_resumen->>'mora_pendiente')::numeric
                           + (v_resumen->>'interes_vencido')::numeric + (v_resumen->>'capital_vencido')::numeric
                           + (v_resumen->>'cuota_corriente_pendiente')::numeric + (v_resumen->>'capital_posterior')::numeric);

  return jsonb_build_object('credito', to_jsonb(c), 'cuotas', v_cuotas, 'cargos', v_cargos, 'pagos', v_pagos, 'resumen', v_resumen);
end $$;

-- ─── Recalculo diario (job externo: select recalcular_mora();) ──
create or replace function public.recalcular_mora() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from creditos where estado not in ('cancelado', 'castigado') loop
    perform public.fn_generar_cargos(r.id, current_date);
    perform public.fn_actualizar_estado_credito(r.id);
  end loop;
end $$;

-- ─── Permisos de ejecución ───────────────────────────────────
revoke all on function public.aplicar_pago(text, numeric, text, text, date, text, text) from public;
grant execute on function public.aplicar_pago(text, numeric, text, text, date, text, text) to authenticated;
revoke all on function public.simular_pago(text, numeric, date) from public;
grant execute on function public.simular_pago(text, numeric, date) to authenticated;
revoke all on function public.estado_cuenta(text, date) from public;
grant execute on function public.estado_cuenta(text, date) to authenticated;
revoke all on function public.desembolsar_solicitud(text, date) from public;
grant execute on function public.desembolsar_solicitud(text, date) to authenticated;
revoke all on function public.generar_cronograma(text) from public;
revoke all on function public.recalcular_mora() from public;
revoke all on function public.fn_generar_cargos(text, date) from public;
revoke all on function public.fn_reprogramar_tras_anticipo(text) from public;
revoke all on function public.fn_actualizar_estado_credito(text) from public;
