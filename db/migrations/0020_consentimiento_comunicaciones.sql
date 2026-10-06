-- ═══════════════════════════════════════════════════════════════
-- 0020 — Consentimiento de comunicaciones comerciales (campañas) y
-- redes sociales en el portal.
-- prospectos / clientes / solicitantes: acepta_comunicaciones,
-- consentimiento_fecha (último cambio del permiso, la fija la BD),
-- consentimiento_origen (formulario | portal | visita | otro).
-- solicitantes: instagram, facebook (el solicitante los da en su perfil).
-- El prospecto del portal hereda redes y consentimiento; el cliente que
-- nace de un prospecto del portal también. Idempotente.
-- ═══════════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array['prospectos','clientes','solicitantes'] loop
    execute format('alter table %I add column if not exists acepta_comunicaciones boolean not null default false', t);
    execute format('alter table %I add column if not exists consentimiento_fecha timestamptz', t);
    execute format('alter table %I add column if not exists consentimiento_origen text', t);
    execute format('alter table %I drop constraint if exists chk_%s_consent_origen', t, t);
    execute format($f$alter table %I add constraint chk_%s_consent_origen
      check (consentimiento_origen is null or consentimiento_origen in ('formulario','portal','visita','otro'))$f$, t, t);
  end loop;
end $$;

alter table solicitantes add column if not exists instagram text;
alter table solicitantes add column if not exists facebook  text;
alter table solicitantes drop constraint if exists chk_solicitantes_redes_len;
alter table solicitantes add constraint chk_solicitantes_redes_len
  check (coalesce(length(instagram), 0) <= 300 and coalesce(length(facebook), 0) <= 300);

-- La fecha del consentimiento la pone la base de datos (no se puede falsear desde el cliente)
create or replace function public.fn_sellar_consentimiento() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.acepta_comunicaciones then
      new.consentimiento_fecha := coalesce(new.consentimiento_fecha, now());
      new.consentimiento_origen := coalesce(new.consentimiento_origen, case when tg_table_name = 'solicitantes' then 'portal' else 'formulario' end);
    else
      new.consentimiento_fecha := null;
    end if;
  elsif new.acepta_comunicaciones is distinct from old.acepta_comunicaciones then
    -- alta o revocación: queda la fecha del cambio
    new.consentimiento_fecha := now();
    if new.acepta_comunicaciones then
      new.consentimiento_origen := coalesce(new.consentimiento_origen, case when tg_table_name = 'solicitantes' then 'portal' else 'formulario' end);
    end if;
  else
    new.consentimiento_fecha := old.consentimiento_fecha;
  end if;
  return new;
end $$;

drop trigger if exists trg_sellar_consentimiento on prospectos;
create trigger trg_sellar_consentimiento before insert or update on prospectos
  for each row execute function public.fn_sellar_consentimiento();
drop trigger if exists trg_sellar_consentimiento on clientes;
create trigger trg_sellar_consentimiento before insert or update on clientes
  for each row execute function public.fn_sellar_consentimiento();
drop trigger if exists trg_sellar_consentimiento on solicitantes;
create trigger trg_sellar_consentimiento before insert or update on solicitantes
  for each row execute function public.fn_sellar_consentimiento();

-- Solicitante → prospecto (redefine 0010: añade redes y consentimiento)
create or replace function public.fn_sync_prospecto_solicitante() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sexo text := case when new.genero in ('M','F','otro') then new.genero end;
  v_estado text := case when new.cliente_id is not null then 'convertido' else 'nuevo' end;
begin
  insert into prospectos (id, nombre, documento, telefono, email, sexo, estado, fecha_registro,
                          canal_preferido, canal_captacion, pais, ciudad, localidad, direccion, solicitante_id,
                          instagram, facebook, acepta_comunicaciones, consentimiento_origen)
  values ('pro-' || substr(md5(new.id), 1, 12), coalesce(nullif(btrim(new.nombre), ''), new.email),
          coalesce(nullif(btrim(new.documento), ''), 'pendiente'), new.telefono, new.email, v_sexo, v_estado,
          coalesce(new.creado_en, now())::date, 'whatsapp', 'portal',
          new.pais, new.ciudad, new.localidad, new.direccion, new.id,
          new.instagram, new.facebook, new.acepta_comunicaciones, case when new.acepta_comunicaciones then 'portal' end)
  on conflict (solicitante_id) where solicitante_id is not null do update set
    nombre = excluded.nombre, documento = excluded.documento, telefono = excluded.telefono,
    email = excluded.email, sexo = excluded.sexo,
    pais = excluded.pais, ciudad = excluded.ciudad, localidad = excluded.localidad, direccion = excluded.direccion,
    instagram = excluded.instagram, facebook = excluded.facebook,
    acepta_comunicaciones = excluded.acepta_comunicaciones,
    consentimiento_origen = case when excluded.acepta_comunicaciones then 'portal' else prospectos.consentimiento_origen end,
    estado = case when new.cliente_id is not null then 'convertido' else prospectos.estado end;
  return new;
end $$;

-- Prospecto del portal → cliente (redefine 0019: también el consentimiento)
create or replace function public.fn_copiar_redes_prospecto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cliente_id is not null and new.cliente_id is distinct from old.cliente_id then
    update clientes c
       set instagram = coalesce(c.instagram, p.instagram),
           facebook  = coalesce(c.facebook,  p.facebook),
           acepta_comunicaciones = c.acepta_comunicaciones or p.acepta_comunicaciones,
           consentimiento_origen = coalesce(c.consentimiento_origen, p.consentimiento_origen)
      from prospectos p
     where c.id = new.cliente_id and p.solicitante_id = new.id;
  end if;
  return new;
end $$;
