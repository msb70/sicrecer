-- ═══════════════════════════════════════════════════════════════
-- 0005 — Requisitos con adjunto en el portal.
-- Cada requisito de producto se cubre con un archivo (imagen o PDF) que
-- sube el solicitante, salvo los que ya cubre el perfil (documento de
-- identidad y selfie). Idempotente.
-- ═══════════════════════════════════════════════════════════════

-- Tipo de requisito: cómo se satisface
alter table requisitos add column if not exists tipo text not null default 'archivo'
  check (tipo in ('archivo','documento_identidad','selfie'));
update requisitos set tipo = 'documento_identidad' where id = 'req-01' and tipo = 'archivo';
update requisitos set tipo = 'selfie' where id = 'req-04' and tipo = 'archivo';

-- Adjuntos del solicitante por requisito (reutilizables entre solicitudes)
create table if not exists solicitante_requisitos (
  id bigint generated always as identity primary key,
  solicitante_id text not null references solicitantes(id) on delete cascade,
  requisito_id text not null references requisitos(id),
  nombre_archivo text not null,
  mime text not null,
  bytes bytea not null,
  creado_en timestamptz not null default now(),
  unique (solicitante_id, requisito_id)
);
alter table solicitante_requisitos drop constraint if exists chk_req_tamano;
alter table solicitante_requisitos add constraint chk_req_tamano check (octet_length(bytes) <= 1200000);
alter table solicitante_requisitos enable row level security;

drop policy if exists sel_whitelist on solicitante_requisitos;
create policy sel_whitelist on solicitante_requisitos for select to authenticated using (public.fn_rol_actual() is not null);
drop policy if exists sel_propio on solicitante_requisitos;
create policy sel_propio on solicitante_requisitos for select to authenticated using (solicitante_id = public.fn_solicitante_actual());
drop policy if exists ins_propio on solicitante_requisitos;
create policy ins_propio on solicitante_requisitos for insert to authenticated with check (solicitante_id = public.fn_solicitante_actual());
drop policy if exists upd_propio on solicitante_requisitos;
create policy upd_propio on solicitante_requisitos for update to authenticated
  using (solicitante_id = public.fn_solicitante_actual()) with check (solicitante_id = public.fn_solicitante_actual());
drop policy if exists del_propio on solicitante_requisitos;
create policy del_propio on solicitante_requisitos for delete to authenticated using (solicitante_id = public.fn_solicitante_actual());

-- Validación de solicitud externa: requisitos obligatorios cubiertos de verdad
create or replace function public.fn_validar_solicitud_externa() returns trigger
language plpgsql security definer set search_path = public as $$
declare p productos_credito%rowtype; s solicitantes%rowtype; r record; v_faltan text[] := '{}'; v_cubiertos text[] := '{}';
begin
  if new.origen <> 'externo' then return new; end if;
  select * into p from productos_credito where id = new.producto_id;
  if not found or not p.publico or not p.activo then raise exception 'Producto no disponible'; end if;
  select * into s from solicitantes where id = new.solicitante_id;
  if not found then raise exception 'Solicitante no encontrado'; end if;
  if not (s.pais = any(p.paises)) then raise exception 'El producto no está disponible en tu país'; end if;
  if new.monto_solicitado < p.monto_min or new.monto_solicitado > p.monto_max then
    raise exception 'Monto fuera del rango del producto (% - %)', p.monto_min, p.monto_max; end if;
  if new.plazo < p.plazo_min or new.plazo > p.plazo_max then
    raise exception 'Plazo fuera del rango del producto (% - %)', p.plazo_min, p.plazo_max; end if;
  -- Actividad económica: lista vacía = cualquier actividad
  if cardinality(coalesce(p.actividad_economica_ids, '{}')) > 0
     and (s.actividad_economica_id is null or not (s.actividad_economica_id = any(p.actividad_economica_ids))) then
    raise exception 'Tu actividad económica no es elegible para este producto'; end if;
  -- Fotos del perfil
  if not exists (select 1 from solicitante_documentos d where d.solicitante_id = s.id and d.tipo = 'documento') then
    raise exception 'Debes subir tu documento de identidad'; end if;
  if not exists (select 1 from solicitante_documentos d where d.solicitante_id = s.id and d.tipo = 'selfie') then
    raise exception 'Debes tomarte la foto de verificación'; end if;
  -- Requisitos del producto: obligatorios deben estar cubiertos (perfil o adjunto)
  for r in select q.id, q.nombre, q.obligatorio, q.tipo from requisitos q where q.id = any(coalesce(p.requisito_ids, '{}')) loop
    if r.tipo in ('documento_identidad','selfie')
       or exists (select 1 from solicitante_requisitos a where a.solicitante_id = s.id and a.requisito_id = r.id) then
      v_cubiertos := v_cubiertos || r.id;
    elsif r.obligatorio then
      v_faltan := v_faltan || r.nombre;
    end if;
  end loop;
  if cardinality(v_faltan) > 0 then raise exception 'Faltan requisitos obligatorios: %', array_to_string(v_faltan, ', '); end if;
  new.requisitos_confirmados := to_jsonb(v_cubiertos);
  new.pais := s.pais;
  new.cliente_nombre := coalesce(new.cliente_nombre, s.nombre);
  new.producto_nombre := coalesce(new.producto_nombre, p.nombre);
  new.fecha_solicitud := coalesce(new.fecha_solicitud, current_date);
  return new;
end $$;
