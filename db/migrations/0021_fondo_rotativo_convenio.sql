-- 0021 Fondo rotativo del convenio (2026-10-07)
-- Regla de negocio: el fondo del convenio se recicla con lo que pagan los clientes.
-- saldo_disponible = monto_total - capital pendiente (saldo_capital) de todos los créditos del convenio.
--   * Desembolso: resta el monto (el crédito nace con saldo_capital = monto).
--   * Pago: el capital cobrado vuelve al fondo (baja saldo_capital).
--   * Castigado: su saldo_capital sigue restando (capital perdido no vuelve).
-- El saldo es derivado: ningún cliente (p.ej. FormConvenio) puede fijarlo a mano.

create or replace function public.fn_saldo_convenio(p_convenio_id text)
returns numeric language sql stable security definer set search_path to 'public' as $$
  select c.monto_total - coalesce((select sum(cr.saldo_capital) from creditos cr where cr.convenio_id = c.id), 0)
  from convenios c where c.id = p_convenio_id
$$;

-- Cualquier insert/update de convenios recalcula el saldo (ignora el valor enviado).
create or replace function public.fn_trg_convenio_saldo()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  new.saldo_disponible := new.monto_total - coalesce((select sum(saldo_capital) from creditos where convenio_id = new.id), 0);
  return new;
end $$;

drop trigger if exists trg_convenio_saldo on convenios;
create trigger trg_convenio_saldo before insert or update on convenios
  for each row execute function public.fn_trg_convenio_saldo();

-- Cambios en créditos (desembolso, pagos, reasignación de convenio, borrado) refrescan el saldo.
create or replace function public.fn_trg_credito_saldo_convenio()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.convenio_id is not null then
    update convenios set saldo_disponible = 0 where id = old.convenio_id;  -- valor real lo pone trg_convenio_saldo
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.convenio_id is not null
     and (tg_op = 'INSERT' or new.convenio_id is distinct from old.convenio_id) then
    update convenios set saldo_disponible = 0 where id = new.convenio_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_credito_saldo_convenio on creditos;
create trigger trg_credito_saldo_convenio
  after insert or delete or update of saldo_capital, convenio_id on creditos
  for each row execute function public.fn_trg_credito_saldo_convenio();

-- desembolsar_solicitud ya no resta a mano (lo haría dos veces).
do $$
declare v_def text;
begin
  v_def := pg_get_functiondef('public.desembolsar_solicitud(text, date)'::regprocedure);
  if position('update convenios set saldo_disponible = saldo_disponible - v_monto where id = p.convenio_id;' in v_def) > 0 then
    execute replace(v_def,
      'update convenios set saldo_disponible = saldo_disponible - v_monto where id = p.convenio_id;',
      '-- saldo del convenio: lo recalcula trg_credito_saldo_convenio (0021)');
  end if;
end $$;

-- Recalcular todos los convenios con la nueva regla.
update convenios set saldo_disponible = 0;
