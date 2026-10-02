-- ═══════════════════════════════════════════════════════════════
-- 0016 — Requisitos de tipo monto y texto.
-- Además de archivo, un requisito puede pedir un monto (p. ej. ingresos
-- mensuales) o un texto libre (p. ej. descripción del negocio). El
-- solicitante lo llena en el portal al pedir el producto; el valor queda
-- guardado en su perfil (se precarga en la siguiente solicitud) y se
-- congela en la solicitud (solicitudes.respuestas_requisitos). Idempotente.
-- ═══════════════════════════════════════════════════════════════

-- Nuevos tipos de requisito
alter table requisitos drop constraint if exists requisitos_tipo_check;
alter table requisitos add constraint requisitos_tipo_check
  check (tipo in ('archivo','monto','texto','documento_identidad','selfie'));

-- La respuesta del solicitante puede ser archivo, monto o texto
alter table solicitante_requisitos alter column nombre_archivo drop not null;
alter table solicitante_requisitos alter column mime drop not null;
alter table solicitante_requisitos alter column bytes drop not null;
alter table solicitante_requisitos add column if not exists valor_numero numeric(18,2);
alter table solicitante_requisitos add column if not exists valor_texto text;
alter table solicitante_requisitos drop constraint if exists chk_req_valor;
alter table solicitante_requisitos add constraint chk_req_valor check (
  (bytes is not null and mime is not null and nombre_archivo is not null)
  or valor_numero is not null
  or (valor_texto is not null and length(btrim(valor_texto)) > 0));
alter table solicitante_requisitos drop constraint if exists chk_req_monto;
alter table solicitante_requisitos add constraint chk_req_monto check (valor_numero is null or valor_numero >= 0);
alter table solicitante_requisitos drop constraint if exists chk_req_texto;
alter table solicitante_requisitos add constraint chk_req_texto check (valor_texto is null or char_length(valor_texto) <= 2000);

-- Copia de las respuestas (monto/texto) en la solicitud, tal como se enviaron
alter table solicitudes add column if not exists respuestas_requisitos jsonb not null default '{}';

-- Validación de solicitud externa: cada tipo se cubre con su dato
create or replace function public.fn_validar_solicitud_externa() returns trigger
language plpgsql security definer set search_path = public as $$
declare p productos_credito%rowtype; s solicitantes%rowtype; r record; a solicitante_requisitos%rowtype;
        v_faltan text[] := '{}'; v_cubiertos text[] := '{}'; v_resp jsonb := '{}'; v_ok boolean;
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
  if cardinality(coalesce(p.actividad_economica_ids, '{}')) > 0
     and (s.actividad_economica_id is null or not (s.actividad_economica_id = any(p.actividad_economica_ids))) then
    raise exception 'Tu actividad económica no es elegible para este producto'; end if;
  if not exists (select 1 from solicitante_documentos d where d.solicitante_id = s.id and d.tipo = 'documento') then
    raise exception 'Debes subir tu documento de identidad'; end if;
  if not exists (select 1 from solicitante_documentos d where d.solicitante_id = s.id and d.tipo = 'selfie') then
    raise exception 'Debes tomarte la foto de verificación'; end if;
  for r in select q.id, q.nombre, q.obligatorio, q.tipo from requisitos q where q.id = any(coalesce(p.requisito_ids, '{}')) loop
    select * into a from solicitante_requisitos x where x.solicitante_id = s.id and x.requisito_id = r.id;
    v_ok := case r.tipo
      when 'documento_identidad' then true
      when 'selfie' then true
      when 'monto' then a.valor_numero is not null
      when 'texto' then a.valor_texto is not null and length(btrim(a.valor_texto)) > 0
      else a.bytes is not null
    end;
    if v_ok then
      v_cubiertos := v_cubiertos || r.id;
      if r.tipo = 'monto' then
        v_resp := v_resp || jsonb_build_object(r.id, jsonb_build_object('nombre', r.nombre, 'tipo', r.tipo, 'valor', a.valor_numero));
      elsif r.tipo = 'texto' then
        v_resp := v_resp || jsonb_build_object(r.id, jsonb_build_object('nombre', r.nombre, 'tipo', r.tipo, 'valor', btrim(a.valor_texto)));
      end if;
    elsif r.obligatorio then
      v_faltan := v_faltan || r.nombre;
    end if;
  end loop;
  if cardinality(v_faltan) > 0 then raise exception 'Faltan requisitos obligatorios: %', array_to_string(v_faltan, ', '); end if;
  new.requisitos_confirmados := to_jsonb(v_cubiertos);
  new.respuestas_requisitos := v_resp;
  new.pais := s.pais;
  new.cliente_nombre := coalesce(new.cliente_nombre, s.nombre);
  new.producto_nombre := coalesce(new.producto_nombre, p.nombre);
  new.fecha_solicitud := coalesce(new.fecha_solicitud, current_date);
  return new;
end $$;
