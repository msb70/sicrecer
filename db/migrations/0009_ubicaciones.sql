-- 0009 — Ubicación (país, ciudad, localidad, dirección) y cobertura de productos
-- Catálogo: 20 localidades de Bogotá + municipios colindantes; cualquier otra
-- ciudad se escribe libre. Espejo en src/lib/ubicaciones.ts.

alter table prospectos
  add column if not exists pais text,
  add column if not exists ciudad text,
  add column if not exists localidad text,
  add column if not exists direccion text;

alter table clientes
  add column if not exists pais text,
  add column if not exists ciudad text,
  add column if not exists localidad text,
  add column if not exists direccion text;

alter table solicitantes add column if not exists localidad text;

alter table productos_credito add column if not exists cobertura text[] not null default '{}';
comment on column productos_credito.cobertura is
  'Dónde se ofrece: ''Bogotá'' (toda), ''Bogotá|Usme'' (localidad), municipio, ''*otras'' (ciudades fuera del catálogo). Vacío = cualquier lugar';

create or replace function public.fn_norm_txt(t text) returns text
language sql immutable as $$
  select lower(btrim(translate(coalesce(t, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')))
$$;

create or replace function public.fn_cobertura_incluye(p_cob text[], p_ciudad text, p_localidad text) returns boolean
language plpgsql immutable as $$
declare
  v_cob text[] := array(select x from unnest(coalesce(p_cob, '{}')) x where coalesce(x, '') <> '');
  v_c   text := public.fn_norm_txt(p_ciudad);
begin
  if cardinality(v_cob) = 0 then return true; end if;
  if v_c = '' then return false; end if;
  if v_c <> all (array['bogota','soacha','chia','cajica','zipaquira','facatativa','madrid','funza','mosquera']) then
    return '*otras' = any(v_cob);
  end if;
  if exists (select 1 from unnest(v_cob) x where public.fn_norm_txt(x) = v_c) then return true; end if;
  return coalesce(p_localidad, '') <> ''
     and exists (select 1 from unnest(v_cob) x where public.fn_norm_txt(x) = v_c || '|' || public.fn_norm_txt(p_localidad));
end $$;

-- Validar cobertura al crear la solicitud (o si cambia el producto)
create or replace function public.fn_validar_cobertura_solicitud() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cob text[]; v_nombre text; v_ciudad text; v_localidad text;
begin
  if tg_op = 'UPDATE' and new.producto_id is not distinct from old.producto_id then return new; end if;
  select cobertura, nombre into v_cob, v_nombre from productos_credito where id = new.producto_id;
  if cardinality(coalesce(v_cob, '{}')) = 0 then return new; end if;
  if new.solicitante_id is not null then
    select ciudad, localidad into v_ciudad, v_localidad from solicitantes where id = new.solicitante_id;
  elsif new.cliente_id is not null then
    select ciudad, localidad into v_ciudad, v_localidad from clientes where id = new.cliente_id;
  end if;
  if coalesce(btrim(v_ciudad), '') = '' then
    raise exception 'Registra la ciudad (y localidad en Bogotá) del cliente: el producto % solo se ofrece en zonas específicas', v_nombre;
  end if;
  if not public.fn_cobertura_incluye(v_cob, v_ciudad, v_localidad) then
    raise exception 'El producto % no está disponible en %', v_nombre,
      coalesce(nullif(v_localidad, '') || ', ', '') || v_ciudad;
  end if;
  return new;
end $$;
drop trigger if exists trg_validar_cobertura on solicitudes;
create trigger trg_validar_cobertura before insert or update of producto_id on solicitudes
  for each row execute function public.fn_validar_cobertura_solicitud();

-- Al convertir un solicitante en cliente, copiar su ubicación
create or replace function public.fn_copiar_ubicacion_solicitante() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cliente_id is not null and new.cliente_id is distinct from old.cliente_id then
    update clientes set pais = coalesce(pais, new.pais), ciudad = coalesce(ciudad, new.ciudad),
                        localidad = coalesce(localidad, new.localidad), direccion = coalesce(direccion, new.direccion)
    where id = new.cliente_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_copiar_ubicacion on solicitantes;
create trigger trg_copiar_ubicacion after update of cliente_id on solicitantes
  for each row execute function public.fn_copiar_ubicacion_solicitante();

-- Clientes que ya vienen del portal
update clientes c set pais = s.pais, ciudad = s.ciudad, direccion = s.direccion
from solicitantes s
where s.cliente_id = c.id and c.ciudad is null;
