-- ─────────────────────────────────────────────────────────────
-- 0003 · Lógica transaccional, cronograma real, auditoría y RBAC
-- Aplicado 2026-07-04.
-- ─────────────────────────────────────────────────────────────

-- ─── Créditos: condiciones financieras propias ───────────────
alter table creditos
  add column if not exists producto_id text references productos_credito(id),
  add column if not exists tasa_nominal_anual numeric,
  add column if not exists metodo_interes text check (metodo_interes in ('flat','declining_balance')),
  add column if not exists frecuencia text check (frecuencia in ('semanal','quincenal','mensual'));

update creditos c
set producto_id = p.id,
    tasa_nominal_anual = p.tasa_nominal_anual,
    metodo_interes = p.metodo_interes,
    frecuencia = p.frecuencia
from productos_credito p
where p.nombre = c.producto_nombre;

-- ─── Cronograma de cuotas real ───────────────────────────────
create table if not exists cronograma_cuotas (
  id bigint generated always as identity primary key,
  credito_id text not null references creditos(id),
  num int not null check (num > 0),
  fecha_vencimiento date not null,
  cuota numeric not null check (cuota > 0),
  capital numeric not null check (capital >= 0),
  interes numeric not null check (interes >= 0),
  saldo_posterior numeric not null check (saldo_posterior >= 0),
  monto_pagado numeric not null default 0 check (monto_pagado >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente','parcial','pagada','vencida')),
  pagada_en date,
  unique (credito_id, num)
);
create index if not exists idx_cronograma_credito_estado on cronograma_cuotas (credito_id, estado);
create index if not exists idx_cronograma_vencimiento on cronograma_cuotas (fecha_vencimiento) where estado <> 'pagada';

-- Idempotencia de cobranzas
alter table cobranzas add column if not exists clave_idempotencia text unique;

-- ─── Auditoría inmutable ─────────────────────────────────────
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  fecha timestamptz not null default now(),
  actor text not null,
  accion text not null,
  tabla text not null,
  registro_id text,
  datos jsonb
);
alter table cronograma_cuotas enable row level security;
alter table audit_log enable row level security;
grant select, insert, update, delete on cronograma_cuotas to authenticated;
grant select on audit_log to authenticated;
revoke insert, update, delete on audit_log from authenticated;

create or replace function public.fn_audit() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare v_actor text;
begin
  begin v_actor := coalesce(auth.user_id(), session_user); exception when others then v_actor := session_user; end;
  insert into audit_log (actor, accion, tabla, registro_id, datos)
  values (v_actor, TG_OP, TG_TABLE_NAME,
          case when TG_OP = 'DELETE' then row_to_json(OLD)->>'id' else row_to_json(NEW)->>'id' end,
          case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['creditos','cobranzas','pagos','solicitudes','cronograma_cuotas','convenios'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.fn_audit()', t);
  end loop;
end $$;

-- ─── Helpers de identidad (whitelist ← Neon Auth) ────────────
create or replace function public.fn_rol_actual() returns text
language sql stable security definer set search_path = public, neon_auth, auth as $$
  select u.rol from public.usuarios u
  join neon_auth."user" nu on lower(nu.email) = lower(u.email)
  where nu.id::text = auth.user_id() limit 1
$$;

create or replace function public.fn_org_actual() returns text
language sql stable security definer set search_path = public, neon_auth, auth as $$
  select u.organizacion_id from public.usuarios u
  join neon_auth."user" nu on lower(nu.email) = lower(u.email)
  where nu.id::text = auth.user_id() limit 1
$$;

-- ─── Matriz RBAC en RLS ──────────────────────────────────────
-- Reemplaza la política genérica acceso_autenticado de 0001.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop policy if exists acceso_autenticado on public.%I', t);
  end loop;

  -- Lectura: cualquier usuario de la whitelist
  for t in select tablename from pg_tables where schemaname = 'public'
           and tablename not in ('audit_log','organizaciones','usuarios','convenios') loop
    execute format('drop policy if exists sel_whitelist on public.%I', t);
    execute format('create policy sel_whitelist on public.%I for select to authenticated using (public.fn_rol_actual() is not null)', t);
  end loop;

  -- Escritura de catálogos: solo administrador
  foreach t in array array['organizaciones','bancos','requisitos','actividades_economicas','convenios','productos_credito','usuarios'] loop
    execute format('drop policy if exists ins_admin on public.%I', t);
    execute format('drop policy if exists upd_admin on public.%I', t);
    execute format('drop policy if exists del_admin on public.%I', t);
    execute format('create policy ins_admin on public.%I for insert to authenticated with check (public.fn_rol_actual() = ''administrador'')', t);
    execute format('create policy upd_admin on public.%I for update to authenticated using (public.fn_rol_actual() = ''administrador'') with check (public.fn_rol_actual() = ''administrador'')', t);
    execute format('create policy del_admin on public.%I for delete to authenticated using (public.fn_rol_actual() = ''administrador'')', t);
  end loop;

  -- Escritura de operación: administrador, coordinador, facilitador
  foreach t in array array['prospectos','actividades_crm','clientes','solicitudes','visitas'] loop
    execute format('drop policy if exists ins_operacion on public.%I', t);
    execute format('drop policy if exists upd_operacion on public.%I', t);
    execute format('drop policy if exists del_operacion on public.%I', t);
    execute format('create policy ins_operacion on public.%I for insert to authenticated with check (public.fn_rol_actual() in (''administrador'',''coordinador'',''facilitador''))', t);
    execute format('create policy upd_operacion on public.%I for update to authenticated using (public.fn_rol_actual() in (''administrador'',''coordinador'',''facilitador'')) with check (public.fn_rol_actual() in (''administrador'',''coordinador'',''facilitador''))', t);
    execute format('create policy del_operacion on public.%I for delete to authenticated using (public.fn_rol_actual() in (''administrador'',''coordinador''))', t);
  end loop;
  -- Dinero (creditos, cobranzas, pagos, cronograma_cuotas, kpi_reportes):
  -- sin políticas de escritura → denegado por RLS; solo funciones SECURITY DEFINER.
end $$;

-- Lectura con aislamiento por organización
drop policy if exists sel_org on organizaciones;
create policy sel_org on organizaciones for select to authenticated using (id = public.fn_org_actual());
drop policy if exists sel_org on usuarios;
create policy sel_org on usuarios for select to authenticated using (organizacion_id = public.fn_org_actual());
drop policy if exists sel_org on convenios;
create policy sel_org on convenios for select to authenticated using (organizacion_id = public.fn_org_actual());

-- Auditoría: lectura solo administrador/auditor
drop policy if exists sel_admin_auditor on audit_log;
create policy sel_admin_auditor on audit_log for select to authenticated
  using (public.fn_rol_actual() in ('administrador','auditor'));

-- ─── Generación de cronograma ────────────────────────────────
create or replace function public.generar_cronograma(p_credito_id text) returns void
language plpgsql security definer set search_path = public as $$
declare
  c creditos%rowtype;
  v_periodos int; v_paso interval; v_r numeric;
  v_cuota numeric; v_saldo numeric; v_interes numeric; v_capital numeric; v_fecha date; n int;
begin
  select * into c from creditos where id = p_credito_id;
  if not found then raise exception 'Crédito % no existe', p_credito_id; end if;
  if c.tasa_nominal_anual is null or c.metodo_interes is null or c.frecuencia is null then
    raise exception 'Crédito % sin tasa/método/frecuencia', p_credito_id;
  end if;
  if exists (select 1 from cronograma_cuotas q where q.credito_id = p_credito_id and q.monto_pagado > 0 and q.num > c.cuotas_pagadas) then
    raise exception 'El crédito % tiene pagos aplicados; no se puede regenerar el cronograma', p_credito_id;
  end if;
  delete from cronograma_cuotas where credito_id = p_credito_id;

  v_periodos := case c.frecuencia when 'semanal' then 52 when 'quincenal' then 24 else 12 end;
  v_paso := case c.frecuencia when 'semanal' then interval '7 days' when 'quincenal' then interval '15 days' else interval '1 month' end;
  v_r := c.tasa_nominal_anual / 100.0 / v_periodos;

  if c.metodo_interes = 'flat' then
    v_cuota := round((c.monto_desembolsado + c.monto_desembolsado * v_r * c.cuotas_total) / c.cuotas_total);
  elsif v_r = 0 then
    v_cuota := round(c.monto_desembolsado / c.cuotas_total);
  else
    v_cuota := round(c.monto_desembolsado * (v_r * power(1 + v_r, c.cuotas_total)) / (power(1 + v_r, c.cuotas_total) - 1));
  end if;

  v_saldo := c.monto_desembolsado;
  for n in 1..c.cuotas_total loop
    v_fecha := (c.fecha_desembolso + (v_paso * n))::date;
    v_interes := case when c.metodo_interes = 'flat' then round(c.monto_desembolsado * v_r) else round(v_saldo * v_r) end;
    v_capital := v_cuota - v_interes;
    if n = c.cuotas_total then v_capital := v_saldo; v_cuota := v_capital + v_interes; end if;
    v_saldo := greatest(0, v_saldo - v_capital);
    insert into cronograma_cuotas (credito_id, num, fecha_vencimiento, cuota, capital, interes, saldo_posterior, monto_pagado, estado, pagada_en)
    values (c.id, n, v_fecha, v_cuota, v_capital, v_interes, v_saldo,
            case when n <= c.cuotas_pagadas then v_cuota else 0 end,
            case when n <= c.cuotas_pagadas then 'pagada' when v_fecha < current_date then 'vencida' else 'pendiente' end,
            case when n <= c.cuotas_pagadas then v_fecha end);
  end loop;
end $$;

-- ─── Aplicación transaccional de pagos ───────────────────────
-- Asigna el monto contra cuotas pendientes en orden (interés y capital
-- proporcionales por cuota), actualiza crédito, inserta cobranza y pagos.
-- Idempotente por clave_idempotencia. Requiere rol facilitador o superior.
create or replace function public.aplicar_pago(
  p_credito_id text, p_monto numeric, p_banco text, p_numero_deposito text,
  p_fecha date default current_date, p_clave_idempotencia text default null
) returns jsonb
language plpgsql security definer set search_path = public, neon_auth, auth as $$
declare
  v_usuario usuarios%rowtype;
  v_credito creditos%rowtype;
  q record;
  v_restante numeric; v_abono numeric; v_int numeric; v_cap numeric;
  v_capital_aplicado numeric := 0;
  v_cuotas int[] := '{}';
  v_cob_id text; v_dup text;
  v_pagadas int; v_prox date; v_mora int;
begin
  -- Resolver usuario: JWT del Data API; si no hay JWT y la sesión es del owner (consola), usar admin u-00
  select u.* into v_usuario from usuarios u
  join neon_auth."user" nu on lower(nu.email) = lower(u.email)
  where nu.id::text = auth.user_id() limit 1;
  if v_usuario.id is null and session_user not in ('authenticated', 'anonymous', 'authenticator') then
    select * into v_usuario from usuarios where id = 'u-00';
  end if;
  if v_usuario.id is null then raise exception 'Usuario no autorizado para registrar pagos'; end if;
  if v_usuario.rol not in ('administrador', 'coordinador', 'facilitador') then
    raise exception 'El rol % no puede registrar pagos', v_usuario.rol;
  end if;
  if p_monto is null or p_monto <= 0 then raise exception 'El monto debe ser mayor que cero'; end if;

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

  v_cob_id := 'cob-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
  v_restante := p_monto;

  for q in select * from cronograma_cuotas
           where credito_id = p_credito_id and estado <> 'pagada'
           order by num for update loop
    exit when v_restante <= 0;
    v_abono := least(v_restante, q.cuota - q.monto_pagado);
    continue when v_abono <= 0;
    v_int := round(v_abono * q.interes / q.cuota);
    v_cap := v_abono - v_int;
    update cronograma_cuotas set
      monto_pagado = monto_pagado + v_abono,
      estado = case when monto_pagado + v_abono >= cuota then 'pagada' else 'parcial' end,
      pagada_en = case when monto_pagado + v_abono >= cuota then p_fecha else pagada_en end
    where id = q.id;
    insert into pagos (id, credito_id, cuota_num, fecha, monto_capital, monto_interes, monto_total, metodo, referencia, registrado_por)
    values (v_cob_id || '-c' || q.num, p_credito_id, q.num, p_fecha, v_cap, v_int, v_abono, 'transferencia', p_numero_deposito, v_usuario.nombre);
    v_capital_aplicado := v_capital_aplicado + v_cap;
    if (q.monto_pagado + v_abono) >= q.cuota then v_cuotas := v_cuotas || q.num; end if;
    v_restante := v_restante - v_abono;
  end loop;

  select count(*) filter (where estado = 'pagada'), min(fecha_vencimiento) filter (where estado <> 'pagada')
    into v_pagadas, v_prox from cronograma_cuotas where credito_id = p_credito_id;
  v_mora := coalesce((select current_date - min(fecha_vencimiento) from cronograma_cuotas
                      where credito_id = p_credito_id and estado <> 'pagada' and fecha_vencimiento < current_date), 0);

  update creditos set
    saldo_capital = greatest(0, saldo_capital - v_capital_aplicado),
    cuotas_pagadas = v_pagadas,
    proxima_cuota = v_prox,
    dias_mora = greatest(v_mora, 0),
    estado = case when v_pagadas >= cuotas_total then 'cancelado' when v_mora > 0 then 'en_mora' else 'al_dia' end
  where id = p_credito_id;

  insert into cobranzas (id, cliente_id, cliente_nombre, credito_id, fecha, banco, numero_deposito, monto, cuotas_aplicadas, creado_por, clave_idempotencia)
  values (v_cob_id, v_credito.cliente_id, v_credito.cliente_nombre, p_credito_id, p_fecha, p_banco, p_numero_deposito, p_monto, v_cuotas, v_usuario.id, p_clave_idempotencia);

  return jsonb_build_object(
    'cobranza_id', v_cob_id,
    'cuotas_completadas', v_cuotas,
    'capital_aplicado', v_capital_aplicado,
    'excedente', greatest(v_restante, 0),
    'saldo_capital', (select saldo_capital from creditos where id = p_credito_id),
    'estado_credito', (select estado from creditos where id = p_credito_id)
  );
end $$;

-- ─── Recalculo diario de mora ────────────────────────────────
-- Programar externamente: select recalcular_mora();  (GitHub Actions / cron)
create or replace function public.recalcular_mora() returns void
language plpgsql security definer set search_path = public as $$
begin
  update cronograma_cuotas set estado = 'vencida'
  where estado in ('pendiente', 'parcial') and fecha_vencimiento < current_date;

  update creditos c set
    dias_mora = coalesce((select current_date - min(q.fecha_vencimiento) from cronograma_cuotas q
                          where q.credito_id = c.id and q.estado <> 'pagada' and q.fecha_vencimiento < current_date), 0),
    estado = case
      when c.cuotas_pagadas >= c.cuotas_total then 'cancelado'
      when exists (select 1 from cronograma_cuotas q where q.credito_id = c.id and q.estado = 'vencida') then 'en_mora'
      else 'al_dia' end
  where c.estado not in ('cancelado', 'castigado');
end $$;

-- ─── Permisos de ejecución ───────────────────────────────────
revoke all on function public.aplicar_pago(text, numeric, text, text, date, text) from public;
grant execute on function public.aplicar_pago(text, numeric, text, text, date, text) to authenticated;
revoke all on function public.generar_cronograma(text) from public;
revoke all on function public.recalcular_mora() from public;

-- ─── Datos: generar cronogramas de los créditos existentes ───
select generar_cronograma('cred-01');
select generar_cronograma('cred-02');
select generar_cronograma('cred-03');
select recalcular_mora();
