-- 0010 — Cada registro del portal (solicitantes) aparece como prospecto
-- Canal de captación 'portal'. El prospecto se crea al registrarse, se
-- actualiza cuando el solicitante edita su perfil y pasa a 'convertido'
-- cuando el solicitante se vuelve cliente.

alter table prospectos add column if not exists solicitante_id text references solicitantes(id) on delete set null;
create unique index if not exists uq_prospectos_solicitante on prospectos (solicitante_id) where solicitante_id is not null;

alter table prospectos drop constraint if exists prospectos_canal_captacion_check;
alter table prospectos add constraint prospectos_canal_captacion_check
  check (canal_captacion = any (array['referido','redes_sociales','evento','visita_facilitador','portal','otro']));

create or replace function public.fn_sync_prospecto_solicitante() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sexo text := case when new.genero in ('M','F','otro') then new.genero end;
  v_estado text := case when new.cliente_id is not null then 'convertido' else 'nuevo' end;
begin
  insert into prospectos (id, nombre, documento, telefono, email, sexo, estado, fecha_registro,
                          canal_preferido, canal_captacion, pais, ciudad, localidad, direccion, solicitante_id)
  values ('pro-' || substr(md5(new.id), 1, 12), coalesce(nullif(btrim(new.nombre), ''), new.email),
          coalesce(nullif(btrim(new.documento), ''), 'pendiente'), new.telefono, new.email, v_sexo, v_estado,
          coalesce(new.creado_en, now())::date, 'whatsapp', 'portal',
          new.pais, new.ciudad, new.localidad, new.direccion, new.id)
  on conflict (solicitante_id) where solicitante_id is not null do update set
    nombre = excluded.nombre, documento = excluded.documento, telefono = excluded.telefono,
    email = excluded.email, sexo = excluded.sexo,
    pais = excluded.pais, ciudad = excluded.ciudad, localidad = excluded.localidad, direccion = excluded.direccion,
    estado = case when new.cliente_id is not null then 'convertido' else prospectos.estado end;
  return new;
end $$;

drop trigger if exists trg_sync_prospecto on solicitantes;
create trigger trg_sync_prospecto after insert or update on solicitantes
  for each row execute function public.fn_sync_prospecto_solicitante();

-- Solicitantes ya registrados
update solicitantes set actualizado_en = actualizado_en;
