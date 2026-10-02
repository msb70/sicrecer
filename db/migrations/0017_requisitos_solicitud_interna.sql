-- ═══════════════════════════════════════════════════════════════
-- 0017 — Requisitos en la solicitud interna.
-- Cuando el personal crea una solicitud desde el panel, cubre cada
-- requisito del producto en la propia solicitud: archivo (imagen/PDF),
-- monto o texto según requisitos.tipo. Los de tipo documento_identidad
-- y selfie se cubren con un archivo (el cliente interno no tiene perfil
-- de portal). enviar_a_comite exige los obligatorios. Idempotente.
-- ═══════════════════════════════════════════════════════════════

create table if not exists solicitud_requisitos (
  id bigint generated always as identity primary key,
  solicitud_id text not null references solicitudes(id) on delete cascade,
  requisito_id text not null references requisitos(id),
  nombre_archivo text,
  mime text,
  bytes bytea,
  valor_numero numeric(18,2),
  valor_texto text,
  creado_en timestamptz not null default now(),
  unique (solicitud_id, requisito_id)
);
alter table solicitud_requisitos drop constraint if exists chk_sreq_valor;
alter table solicitud_requisitos add constraint chk_sreq_valor check (
  (bytes is not null and mime is not null and nombre_archivo is not null)
  or valor_numero is not null
  or (valor_texto is not null and length(btrim(valor_texto)) > 0));
alter table solicitud_requisitos drop constraint if exists chk_sreq_tamano;
alter table solicitud_requisitos add constraint chk_sreq_tamano check (bytes is null or octet_length(bytes) <= 1200000);
alter table solicitud_requisitos drop constraint if exists chk_sreq_monto;
alter table solicitud_requisitos add constraint chk_sreq_monto check (valor_numero is null or valor_numero >= 0);
alter table solicitud_requisitos drop constraint if exists chk_sreq_texto;
alter table solicitud_requisitos add constraint chk_sreq_texto check (valor_texto is null or char_length(valor_texto) <= 2000);

grant select, insert, update, delete on solicitud_requisitos to authenticated;
alter table solicitud_requisitos enable row level security;

-- Lectura: quien ve la solicitud (la RLS de solicitudes aplica en la subconsulta)
drop policy if exists sel_solicitud on solicitud_requisitos;
create policy sel_solicitud on solicitud_requisitos for select to authenticated
  using (exists (select 1 from solicitudes s where s.id = solicitud_id));
-- Escritura: permiso de editar solicitudes, sobre solicitudes visibles y aún no enviadas al comité
drop policy if exists ins_operacion on solicitud_requisitos;
create policy ins_operacion on solicitud_requisitos for insert to authenticated
  with check (public.fn_permiso_actual('solicitudes', 'editar')
    and exists (select 1 from solicitudes s where s.id = solicitud_id and s.estado in ('borrador','enviada','scoring')));
drop policy if exists upd_operacion on solicitud_requisitos;
create policy upd_operacion on solicitud_requisitos for update to authenticated
  using (public.fn_permiso_actual('solicitudes', 'editar')
    and exists (select 1 from solicitudes s where s.id = solicitud_id and s.estado in ('borrador','enviada','scoring')))
  with check (public.fn_permiso_actual('solicitudes', 'editar'));
drop policy if exists del_operacion on solicitud_requisitos;
create policy del_operacion on solicitud_requisitos for delete to authenticated
  using (public.fn_permiso_actual('solicitudes', 'editar')
    and exists (select 1 from solicitudes s where s.id = solicitud_id and s.estado in ('borrador','enviada','scoring')));

-- Faltantes obligatorios de una solicitud interna (nombres)
create or replace function public.fn_requisitos_faltantes_interna(p_solicitud_id text) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(q.nombre order by q.nombre), '{}')
  from solicitudes s
  join productos_credito p on p.id = s.producto_id
  join requisitos q on q.id = any(coalesce(p.requisito_ids, '{}'))
  where s.id = p_solicitud_id and q.obligatorio
    and not exists (
      select 1 from solicitud_requisitos a
      where a.solicitud_id = s.id and a.requisito_id = q.id
        and case q.tipo
              when 'monto' then a.valor_numero is not null
              when 'texto' then length(btrim(coalesce(a.valor_texto, ''))) > 0
              else a.bytes is not null
            end)
$$;

create or replace function public.enviar_a_comite(p_solicitud_id text) returns jsonb
language plpgsql security definer set search_path = public, neon_auth, auth as $$
declare v_u usuarios; v_s solicitudes%rowtype; v_c comites%rowtype; m record; v_n int := 0; v_faltan text[];
begin
  v_u := public.fn_usuario_actual();
  if v_u.id is null or not public.fn_permiso_actual('solicitudes', 'editar') then
    raise exception 'No autorizado'; end if;
  select * into v_s from solicitudes where id = p_solicitud_id for update;
  if not found then raise exception 'Solicitud no existe'; end if;
  if v_s.estado not in ('enviada','scoring') then raise exception 'La solicitud no está pendiente de revisión (estado %)', v_s.estado; end if;
  -- Solicitud interna: requisitos obligatorios cubiertos en la solicitud
  if v_s.origen <> 'externo' then
    v_faltan := public.fn_requisitos_faltantes_interna(v_s.id);
    if cardinality(v_faltan) > 0 then
      raise exception 'Faltan requisitos obligatorios: %', array_to_string(v_faltan, ', '); end if;
  end if;
  select * into v_c from comites where producto_id = v_s.producto_id and activo limit 1;
  if not found then raise exception 'No hay un comité activo para el producto %', v_s.producto_nombre; end if;
  if not exists (select 1 from comite_miembros where comite_id = v_c.id) then
    raise exception 'El comité % no tiene miembros', v_c.nombre; end if;

  update solicitudes set estado = 'revision_comite', comite_id = v_c.id,
    enviada_comite_en = now(), enviada_comite_por = v_u.id,
    facilitador_id = coalesce(facilitador_id, v_u.id)
  where id = p_solicitud_id;

  for m in select u.email, u.nombre from comite_miembros cm join usuarios u on u.id = cm.usuario_id where cm.comite_id = v_c.id loop
    insert into notificaciones (destinatario, asunto, cuerpo, tipo, referencia) values (
      m.email,
      format('[SiCrecer] Nueva solicitud para el comité %s', v_c.nombre),
      format('Hola %s,%s%sLa solicitud %s de %s (%s, monto %s, plazo %s) fue enviada al comité %s por %s.%s%sEntra a https://sicrecer.com/comite/%s para emitir tu voto.',
        m.nombre, E'\n', E'\n', v_s.id, v_s.cliente_nombre, v_s.producto_nombre, v_s.monto_solicitado, v_s.plazo, v_c.nombre, v_u.nombre, E'\n', E'\n', v_s.id),
      'comite_nueva', v_s.id);
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'comite', v_c.nombre, 'notificados', v_n);
end $$;
