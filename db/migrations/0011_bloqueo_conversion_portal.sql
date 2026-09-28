-- 0011 — Un prospecto del portal no se convierte a mano en cliente
-- Solo pasa a 'convertido' cuando su solicitante ya tiene cliente (lo crea
-- la aprobación del comité). Evita clientes duplicados.
create or replace function public.fn_bloquear_conversion_portal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.solicitante_id is not null and new.estado = 'convertido' and old.estado is distinct from 'convertido'
     and not exists (select 1 from solicitantes where id = new.solicitante_id and cliente_id is not null) then
    raise exception 'Este prospecto viene del portal: se convierte en cliente cuando el comité aprueba su solicitud';
  end if;
  return new;
end $$;
drop trigger if exists trg_bloquear_conversion_portal on prospectos;
create trigger trg_bloquear_conversion_portal before update of estado on prospectos
  for each row execute function public.fn_bloquear_conversion_portal();
