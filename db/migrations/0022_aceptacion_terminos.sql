-- ═══════════════════════════════════════════════════════════════
-- 0022 — Aceptación de Términos y condiciones + Política de tratamiento
-- de datos (autorización previa, expresa e informada — Ley 1581/2012
-- art. 9; prueba de la autorización — Decreto 1377/2013 arts. 7-8,
-- compilado en el Decreto 1074/2015).
-- solicitantes: acepta_terminos, terminos_version, terminos_fecha.
-- La fecha la sella la BD (no se puede falsear desde el navegador) y
-- se vuelve a sellar si cambia la versión aceptada.
-- Una solicitud externa exige haber aceptado. Idempotente.
-- ═══════════════════════════════════════════════════════════════

alter table solicitantes add column if not exists acepta_terminos  boolean not null default false;
alter table solicitantes add column if not exists terminos_version text;
alter table solicitantes add column if not exists terminos_fecha   timestamptz;
alter table solicitantes drop constraint if exists chk_solicitantes_terminos_version;
alter table solicitantes add constraint chk_solicitantes_terminos_version
  check (terminos_version is null or length(terminos_version) <= 40);

create or replace function public.fn_sellar_terminos() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.terminos_fecha := case when new.acepta_terminos then now() end;
  elsif new.acepta_terminos and (not old.acepta_terminos
        or new.terminos_version is distinct from old.terminos_version) then
    new.terminos_fecha := now();
  elsif not new.acepta_terminos then
    new.terminos_fecha := null;
  else
    new.terminos_fecha := old.terminos_fecha;
  end if;
  if not new.acepta_terminos then new.terminos_version := null; end if;
  return new;
end $$;

drop trigger if exists trg_sellar_terminos on solicitantes;
create trigger trg_sellar_terminos before insert or update on solicitantes
  for each row execute function public.fn_sellar_terminos();

-- Solicitud externa: el solicitante debe tener aceptados Términos + Política
create or replace function public.fn_exigir_terminos_solicitud() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.origen = 'externo' and not exists (
       select 1 from solicitantes s where s.id = new.solicitante_id and s.acepta_terminos) then
    raise exception 'Debes aceptar los Términos y condiciones y la Política de tratamiento de datos en tu perfil';
  end if;
  return new;
end $$;

drop trigger if exists trg_exigir_terminos_solicitud on solicitudes;
create trigger trg_exigir_terminos_solicitud before insert on solicitudes
  for each row execute function public.fn_exigir_terminos_solicitud();

-- Data API: refrescar caché de esquema tras aplicar (columnas nuevas)
notify pgrst, 'reload schema';
