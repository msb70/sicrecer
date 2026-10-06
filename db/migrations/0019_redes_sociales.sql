-- ═══════════════════════════════════════════════════════════════
-- 0019 — Redes sociales (Instagram y Facebook) en prospectos y clientes.
-- Se guarda el usuario/ruta normalizado (sin @ ni dominio) o, si no se
-- puede reducir (p. ej. profile.php?id=…), la URL completa. El frontend
-- normaliza con src/lib/redes.ts. Al convertir un prospecto del portal
-- en cliente (comité) se copian sus redes. Idempotente.
-- ═══════════════════════════════════════════════════════════════

alter table prospectos add column if not exists instagram text;
alter table prospectos add column if not exists facebook  text;
alter table clientes   add column if not exists instagram text;
alter table clientes   add column if not exists facebook  text;

alter table prospectos drop constraint if exists chk_prospectos_redes_len;
alter table prospectos add constraint chk_prospectos_redes_len
  check (coalesce(length(instagram), 0) <= 300 and coalesce(length(facebook), 0) <= 300);
alter table clientes drop constraint if exists chk_clientes_redes_len;
alter table clientes add constraint chk_clientes_redes_len
  check (coalesce(length(instagram), 0) <= 300 and coalesce(length(facebook), 0) <= 300);

-- Prospecto del portal → cliente: copiar las redes del prospecto vinculado
create or replace function public.fn_copiar_redes_prospecto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cliente_id is not null and new.cliente_id is distinct from old.cliente_id then
    update clientes c
       set instagram = coalesce(c.instagram, p.instagram),
           facebook  = coalesce(c.facebook,  p.facebook)
      from prospectos p
     where c.id = new.cliente_id and p.solicitante_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_copiar_redes on solicitantes;
create trigger trg_copiar_redes after update of cliente_id on solicitantes
  for each row execute function public.fn_copiar_redes_prospecto();
