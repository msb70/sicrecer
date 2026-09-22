-- ═══════════════════════════════════════════════════════════════
-- 0004 — Portal de solicitantes (autoservicio), comités por producto,
--        decisión de solicitudes y notificaciones (outbox).
-- Requiere 0003. Idempotente.
-- ═══════════════════════════════════════════════════════════════

-- ─── Productos: países y visibilidad pública ─────────────────
alter table productos_credito add column if not exists paises text[] not null default '{}';
alter table productos_credito add column if not exists publico boolean not null default false;
alter table productos_credito add column if not exists activo boolean not null default true;

-- Derivar país inicial del convenio para productos existentes sin países
update productos_credito p set paises = array[c.pais]
from convenios c where c.id = p.convenio_id and (p.paises is null or cardinality(p.paises) = 0);

-- ─── Solicitantes (usuarios externos; NO están en `usuarios`) ─
create table if not exists solicitantes (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  nombre text not null,
  tipo_documento text not null default 'cedula',
  documento text not null,
  fecha_nacimiento date,
  genero text check (genero in ('M','F','otro')),
  telefono text,
  pais text not null check (pais in ('CO','VE')),
  ciudad text,
  direccion text,
  actividad_economica_id text references actividades_economicas(id),
  estado text not null default 'registrado' check (estado in ('registrado','cliente')),
  cliente_id text references clientes(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create unique index if not exists ux_solicitantes_doc on solicitantes (pais, tipo_documento, documento);

-- Fotos (documento de identidad y selfie), comprimidas en cliente
create table if not exists solicitante_documentos (
  id bigint generated always as identity primary key,
  solicitante_id text not null references solicitantes(id) on delete cascade,
  tipo text not null check (tipo in ('documento','selfie')),
  mime text not null default 'image/jpeg',
  bytes bytea not null,
  creado_en timestamptz not null default now(),
  unique (solicitante_id, tipo)
);
alter table solicitante_documentos add constraint chk_doc_tamano check (octet_length(bytes) <= 400000) not valid;

-- ─── Comités por producto ────────────────────────────────────
create table if not exists comites (
  id text primary key default gen_random_uuid()::text,
  nombre text not null,
  producto_id text not null references productos_credito(id),
  organizacion_id text not null references organizaciones(id),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
-- Un solo comité activo por producto
create unique index if not exists ux_comite_activo_producto on comites (producto_id) where activo;

create table if not exists comite_miembros (
  comite_id text not null references comites(id) on delete cascade,
  usuario_id text not null references usuarios(id) on delete cascade,
  primary key (comite_id, usuario_id)
);

create table if not exists comite_votos (
  id bigint generated always as identity primary key,
  solicitud_id text not null references solicitudes(id) on delete cascade,
  comite_id text not null references comites(id),
  usuario_id text not null references usuarios(id),
  decision text not null check (decision in ('aprobado','rechazado')),
  comentario text,
  monto_propuesto numeric,
  plazo_propuesto int,
  fecha timestamptz not null default now(),
  unique (solicitud_id, usuario_id)
);

-- ─── Solicitudes: campos del flujo externo y de decisión ─────
alter table solicitudes alter column cliente_id drop not null;
alter table solicitudes add column if not exists solicitante_id text references solicitantes(id);
alter table solicitudes add column if not exists origen text not null default 'interno' check (origen in ('interno','externo'));
alter table solicitudes add column if not exists pais text;
alter table solicitudes add column if not exists proposito text;
alter table solicitudes add column if not exists requisitos_confirmados jsonb not null default '[]';
alter table solicitudes add column if not exists comite_id text references comites(id);
alter table solicitudes add column if not exists motivo_rechazo text;
alter table solicitudes add column if not exists monto_aprobado numeric;
alter table solicitudes add column if not exists plazo_aprobado int;
alter table solicitudes add column if not exists fecha_decision timestamptz;
alter table solicitudes add column if not exists decidido_por text;
alter table solicitudes add column if not exists enviada_comite_en timestamptz;
alter table solicitudes add column if not exists enviada_comite_por text references usuarios(id);
alter table solicitudes add column if not exists creado_en timestamptz not null default now();
alter table solicitudes alter column id set default gen_random_uuid()::text;
alter table solicitudes alter column fecha_solicitud set default current_date;

-- Una sola solicitud abierta por solicitante y producto
create unique index if not exists ux_solicitud_abierta on solicitudes (solicitante_id, producto_id)
  where solicitante_id is not null and estado in ('borrador','enviada','scoring','revision_comite');

-- ─── Notificaciones (outbox de email) ────────────────────────
create table if not exists notificaciones (
  id bigint generated always as identity primary key,
  destinatario text not null,
  asunto text not null,
  cuerpo text not null,
  tipo text not null,
  referencia text,
  estado text not null default 'pendiente' check (estado in ('pendiente','enviada','error')),
  intentos int not null default 0,
  error text,
  creado_en timestamptz not null default now(),
  enviado_en timestamptz
);

-- ─── Auditoría ───────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['solicitantes','comites','comite_miembros','comite_votos'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.fn_audit()', t);
  end loop;
end $$;

create or replace function public.fn_touch_actualizado() returns trigger
language plpgsql as $$ begin new.actualizado_en := now(); return new; end $$;
drop trigger if exists trg_touch on solicitantes;
create trigger trg_touch before update on solicitantes for each row execute function public.fn_touch_actualizado();

-- ─── RLS ─────────────────────────────────────────────────────
alter table solicitantes enable row level security;
alter table solicitante_documentos enable row level security;
alter table comites enable row level security;
alter table comite_miembros enable row level security;
alter table comite_votos enable row level security;
alter table notificaciones enable row level security;

-- Las tablas nuevas heredan grants por default privileges (0001). Notificaciones: solo funciones.
revoke insert, update, delete on notificaciones from authenticated;

-- Identidad del solicitante (email de Neon Auth ↔ solicitantes.email)
create or replace function public.fn_email_actual() returns text
language sql stable security definer set search_path = public, neon_auth, auth as $$
  select lower(nu.email) from neon_auth."user" nu where nu.id::text = auth.user_id() limit 1
$$;

create or replace function public.fn_solicitante_actual() returns text
language sql stable security definer set search_path = public, neon_auth, auth as $$
  select s.id from public.solicitantes s where s.email = public.fn_email_actual() limit 1
$$;

-- Lectura interna de las tablas nuevas (whitelist) — mismo patrón que 0003
do $$
declare t text;
begin
  foreach t in array array['solicitantes','solicitante_documentos','comites','comite_miembros','comite_votos','notificaciones'] loop
    execute format('drop policy if exists sel_whitelist on public.%I', t);
    execute format('create policy sel_whitelist on public.%I for select to authenticated using (public.fn_rol_actual() is not null)', t);
  end loop;
  -- Comités: escritura solo administrador
  foreach t in array array['comites','comite_miembros'] loop
    execute format('drop policy if exists ins_admin on public.%I', t);
    execute format('drop policy if exists upd_admin on public.%I', t);
    execute format('drop policy if exists del_admin on public.%I', t);
    execute format('create policy ins_admin on public.%I for insert to authenticated with check (public.fn_rol_actual() = ''administrador'')', t);
    execute format('create policy upd_admin on public.%I for update to authenticated using (public.fn_rol_actual() = ''administrador'') with check (public.fn_rol_actual() = ''administrador'')', t);
    execute format('create policy del_admin on public.%I for delete to authenticated using (public.fn_rol_actual() = ''administrador'')', t);
  end loop;
end $$;

-- Políticas del solicitante (fn_rol_actual() es NULL para ellos: nada interno les aplica)
-- Catálogos mínimos para el portal
drop policy if exists sel_solicitante on organizaciones;
create policy sel_solicitante on organizaciones for select to authenticated using (public.fn_solicitante_actual() is not null);
drop policy if exists sel_solicitante on productos_credito;
create policy sel_solicitante on productos_credito for select to authenticated
  using (public.fn_solicitante_actual() is not null and publico and activo);
drop policy if exists sel_solicitante on requisitos;
create policy sel_solicitante on requisitos for select to authenticated using (public.fn_solicitante_actual() is not null);
drop policy if exists sel_solicitante on actividades_economicas;
create policy sel_solicitante on actividades_economicas for select to authenticated using (public.fn_solicitante_actual() is not null);
-- Cualquier usuario autenticado (aún sin perfil) puede leer catálogos para registrarse
drop policy if exists sel_registro on actividades_economicas;
create policy sel_registro on actividades_economicas for select to authenticated using (auth.user_id() is not null);
drop policy if exists sel_registro on productos_credito;
create policy sel_registro on productos_credito for select to authenticated using (auth.user_id() is not null and publico and activo);

-- Perfil propio
drop policy if exists sel_propio on solicitantes;
create policy sel_propio on solicitantes for select to authenticated using (email = public.fn_email_actual());
drop policy if exists ins_propio on solicitantes;
create policy ins_propio on solicitantes for insert to authenticated
  with check (email = public.fn_email_actual() and estado = 'registrado' and cliente_id is null);
drop policy if exists upd_propio on solicitantes;
create policy upd_propio on solicitantes for update to authenticated
  using (email = public.fn_email_actual()) with check (email = public.fn_email_actual() and estado = 'registrado' and cliente_id is null);

-- Documentos propios
drop policy if exists sel_propio on solicitante_documentos;
create policy sel_propio on solicitante_documentos for select to authenticated using (solicitante_id = public.fn_solicitante_actual());
drop policy if exists ins_propio on solicitante_documentos;
create policy ins_propio on solicitante_documentos for insert to authenticated with check (solicitante_id = public.fn_solicitante_actual());
drop policy if exists upd_propio on solicitante_documentos;
create policy upd_propio on solicitante_documentos for update to authenticated
  using (solicitante_id = public.fn_solicitante_actual()) with check (solicitante_id = public.fn_solicitante_actual());
drop policy if exists del_propio on solicitante_documentos;
create policy del_propio on solicitante_documentos for delete to authenticated using (solicitante_id = public.fn_solicitante_actual());

-- Solicitudes propias: leer; crear solo en estado 'enviada' y origen 'externo'
drop policy if exists sel_propio on solicitudes;
create policy sel_propio on solicitudes for select to authenticated using (solicitante_id = public.fn_solicitante_actual());
drop policy if exists ins_propio on solicitudes;
create policy ins_propio on solicitudes for insert to authenticated
  with check (solicitante_id = public.fn_solicitante_actual() and origen = 'externo' and estado = 'enviada'
              and cliente_id is null and comite_id is null and monto_aprobado is null and plazo_aprobado is null
              and motivo_rechazo is null and facilitador_id is null);

-- Votos del comité: lectura interna ya cubierta; escritura solo vía función
-- (sin políticas de insert/update → denegado por RLS)

-- ─── Trigger: validar solicitud externa contra el producto ───
create or replace function public.fn_validar_solicitud_externa() returns trigger
language plpgsql security definer set search_path = public as $$
declare p productos_credito%rowtype; s solicitantes%rowtype; v_req text; v_faltan text[] := '{}';
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
  -- Requisitos obligatorios del producto deben venir confirmados
  for v_req in select r.id from requisitos r where r.obligatorio and r.id = any(coalesce(p.requisito_ids, '{}')) loop
    if not (new.requisitos_confirmados ? v_req) then v_faltan := v_faltan || v_req; end if;
  end loop;
  if cardinality(v_faltan) > 0 then raise exception 'Faltan requisitos obligatorios: %', array_to_string(v_faltan, ', '); end if;
  -- Fotos obligatorias
  if not exists (select 1 from solicitante_documentos d where d.solicitante_id = s.id and d.tipo = 'documento') then
    raise exception 'Debes subir tu documento de identidad'; end if;
  if not exists (select 1 from solicitante_documentos d where d.solicitante_id = s.id and d.tipo = 'selfie') then
    raise exception 'Debes tomarte la foto de verificación'; end if;
  new.pais := s.pais;
  new.cliente_nombre := coalesce(new.cliente_nombre, s.nombre);
  new.producto_nombre := coalesce(new.producto_nombre, p.nombre);
  new.fecha_solicitud := coalesce(new.fecha_solicitud, current_date);
  return new;
end $$;
drop trigger if exists trg_validar_externa on solicitudes;
create trigger trg_validar_externa before insert on solicitudes for each row execute function public.fn_validar_solicitud_externa();

-- ─── Helper: usuario interno actual (misma resolución que aplicar_pago) ──
create or replace function public.fn_usuario_actual() returns usuarios
language plpgsql stable security definer set search_path = public, neon_auth, auth as $$
declare v usuarios%rowtype;
begin
  select u.* into v from usuarios u
  join neon_auth."user" nu on lower(nu.email) = lower(u.email)
  where nu.id::text = auth.user_id() limit 1;
  if v.id is null and session_user not in ('authenticated','anonymous','authenticator') then
    select * into v from usuarios where id = 'u-00';
  end if;
  return v;
end $$;

-- ─── Función: enviar a comité (facilitador / coordinador / admin) ──
create or replace function public.enviar_a_comite(p_solicitud_id text) returns jsonb
language plpgsql security definer set search_path = public, neon_auth, auth as $$
declare v_u usuarios; v_s solicitudes%rowtype; v_c comites%rowtype; m record; v_n int := 0;
begin
  v_u := public.fn_usuario_actual();
  if v_u.id is null or v_u.rol not in ('administrador','coordinador','facilitador') then
    raise exception 'No autorizado'; end if;
  select * into v_s from solicitudes where id = p_solicitud_id for update;
  if not found then raise exception 'Solicitud no existe'; end if;
  if v_s.estado not in ('enviada','scoring') then raise exception 'La solicitud no está pendiente de revisión (estado %)', v_s.estado; end if;
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
revoke all on function public.enviar_a_comite(text) from public;
grant execute on function public.enviar_a_comite(text) to authenticated;

-- ─── Función: votar (miembro del comité). Mayoría simple resuelve. ──
create or replace function public.votar_solicitud(
  p_solicitud_id text, p_decision text, p_comentario text default null,
  p_monto numeric default null, p_plazo int default null
) returns jsonb
language plpgsql security definer set search_path = public, neon_auth, auth as $$
declare v_u usuarios; v_s solicitudes%rowtype; v_c comites%rowtype; v_st solicitantes%rowtype;
        v_miembros int; v_apr int; v_rec int; v_resultado text := 'pendiente';
        v_monto numeric; v_plazo int; v_motivo text; v_cliente_id text; v_p productos_credito%rowtype;
begin
  v_u := public.fn_usuario_actual();
  if v_u.id is null then raise exception 'No autorizado'; end if;
  if p_decision not in ('aprobado','rechazado') then raise exception 'Decisión inválida'; end if;
  select * into v_s from solicitudes where id = p_solicitud_id for update;
  if not found then raise exception 'Solicitud no existe'; end if;
  if v_s.estado <> 'revision_comite' or v_s.comite_id is null then raise exception 'La solicitud no está en comité'; end if;
  select * into v_c from comites where id = v_s.comite_id;
  if not exists (select 1 from comite_miembros where comite_id = v_c.id and usuario_id = v_u.id)
     and v_u.rol <> 'administrador' then
    raise exception 'No eres miembro del comité %', v_c.nombre; end if;
  select * into v_p from productos_credito where id = v_s.producto_id;
  if p_decision = 'aprobado' then
    v_monto := coalesce(p_monto, v_s.monto_solicitado); v_plazo := coalesce(p_plazo, v_s.plazo);
    if v_monto < v_p.monto_min or v_monto > v_p.monto_max then raise exception 'Monto aprobado fuera del rango del producto'; end if;
    if v_plazo < v_p.plazo_min or v_plazo > v_p.plazo_max then raise exception 'Plazo aprobado fuera del rango del producto'; end if;
  elsif coalesce(trim(p_comentario), '') = '' then
    raise exception 'El rechazo requiere un motivo';
  end if;

  insert into comite_votos (solicitud_id, comite_id, usuario_id, decision, comentario, monto_propuesto, plazo_propuesto)
  values (p_solicitud_id, v_c.id, v_u.id, p_decision, p_comentario, v_monto, v_plazo)
  on conflict (solicitud_id, usuario_id) do update
    set decision = excluded.decision, comentario = excluded.comentario,
        monto_propuesto = excluded.monto_propuesto, plazo_propuesto = excluded.plazo_propuesto, fecha = now();

  select count(*) into v_miembros from comite_miembros where comite_id = v_c.id;
  select count(*) filter (where decision = 'aprobado'), count(*) filter (where decision = 'rechazado')
    into v_apr, v_rec from comite_votos where solicitud_id = p_solicitud_id;

  if v_apr * 2 > v_miembros then
    -- Aprobada: condiciones del último voto aprobatorio con propuesta (o las solicitadas)
    select coalesce(monto_propuesto, v_s.monto_solicitado), coalesce(plazo_propuesto, v_s.plazo) into v_monto, v_plazo
    from comite_votos where solicitud_id = p_solicitud_id and decision = 'aprobado' order by fecha desc limit 1;
    v_resultado := 'aprobada';
    -- Solicitante externo → cliente
    if v_s.solicitante_id is not null then
      select * into v_st from solicitantes where id = v_s.solicitante_id for update;
      if v_st.cliente_id is null then
        v_cliente_id := 'cli-' || substr(md5(v_st.id), 1, 12);
        insert into clientes (id, nombre, documento, fecha_nacimiento, genero, actividad_economica, zona, telefono, estado, creditos_activos, total_prestado, facilitador_id)
        values (v_cliente_id, v_st.nombre, v_st.documento, v_st.fecha_nacimiento,
                case when v_st.genero in ('M','F') then v_st.genero else 'F' end,
                coalesce((select nombre from actividades_economicas where id = v_st.actividad_economica_id), 'Sin especificar'),
                coalesce(v_st.ciudad, v_st.pais), coalesce(v_st.telefono, ''), 'activo', 0, 0,
                coalesce(v_s.facilitador_id, v_s.enviada_comite_por, v_u.id));
        update solicitantes set estado = 'cliente', cliente_id = v_cliente_id where id = v_st.id;
      else
        v_cliente_id := v_st.cliente_id;
      end if;
    end if;
    update solicitudes set estado = 'aprobada', monto_aprobado = v_monto, plazo_aprobado = v_plazo,
      fecha_decision = now(), decidido_por = v_c.nombre, cliente_id = coalesce(cliente_id, v_cliente_id)
    where id = p_solicitud_id;
  elsif v_rec * 2 > v_miembros then
    select string_agg(coalesce(comentario, ''), ' | ') into v_motivo from comite_votos where solicitud_id = p_solicitud_id and decision = 'rechazado';
    v_resultado := 'rechazada';
    update solicitudes set estado = 'rechazada', motivo_rechazo = v_motivo, fecha_decision = now(), decidido_por = v_c.nombre
    where id = p_solicitud_id;
  end if;

  -- Notificar al solicitante externo cuando hay decisión
  if v_resultado <> 'pendiente' and v_s.solicitante_id is not null then
    select * into v_st from solicitantes where id = v_s.solicitante_id;
    insert into notificaciones (destinatario, asunto, cuerpo, tipo, referencia) values (
      v_st.email,
      case when v_resultado = 'aprobada' then '[SiCrecer] Tu solicitud fue aprobada' else '[SiCrecer] Resultado de tu solicitud' end,
      case when v_resultado = 'aprobada'
        then format('Hola %s,%s%sTu solicitud de %s fue APROBADA por %s y plazo de %s cuotas. Entra a https://sicrecer.com/portal para ver tu plan de pagos.', v_st.nombre, E'\n', E'\n', v_s.producto_nombre, v_monto, v_plazo)
        else format('Hola %s,%s%sTu solicitud de %s no fue aprobada. Motivo: %s.%s%sPuedes ver el detalle en https://sicrecer.com/portal', v_st.nombre, E'\n', E'\n', v_s.producto_nombre, coalesce(v_motivo, 'sin detalle'), E'\n', E'\n')
      end,
      'decision_solicitante', v_s.id);
  end if;

  return jsonb_build_object('ok', true, 'resultado', v_resultado, 'aprobados', v_apr, 'rechazados', v_rec, 'miembros', v_miembros);
end $$;
revoke all on function public.votar_solicitud(text, text, text, numeric, int) from public;
grant execute on function public.votar_solicitud(text, text, text, numeric, int) to authenticated;

-- ─── Función: marcar notificación enviada (la usa el notificador con DATABASE_URL owner) ──
-- (sin grant a authenticated a propósito)

-- ─── Endurecimiento: toda identidad exige email verificado ────
-- Con registro público por email+contraseña, sin esto alguien podría
-- registrarse con el email de un usuario interno y heredar su rol.
create or replace function public.fn_rol_actual() returns text
language sql stable security definer set search_path = public, neon_auth, auth as $$
  select u.rol from public.usuarios u
  join neon_auth."user" nu on lower(nu.email) = lower(u.email)
  where nu.id::text = auth.user_id() and nu."emailVerified" limit 1
$$;
create or replace function public.fn_org_actual() returns text
language sql stable security definer set search_path = public, neon_auth, auth as $$
  select u.organizacion_id from public.usuarios u
  join neon_auth."user" nu on lower(nu.email) = lower(u.email)
  where nu.id::text = auth.user_id() and nu."emailVerified" limit 1
$$;
create or replace function public.fn_email_actual() returns text
language sql stable security definer set search_path = public, neon_auth, auth as $$
  select lower(nu.email) from neon_auth."user" nu where nu.id::text = auth.user_id() and nu."emailVerified" limit 1
$$;
create or replace function public.fn_usuario_actual() returns usuarios
language plpgsql stable security definer set search_path = public, neon_auth, auth as $$
declare v usuarios%rowtype;
begin
  select u.* into v from usuarios u
  join neon_auth."user" nu on lower(nu.email) = lower(u.email)
  where nu.id::text = auth.user_id() and nu."emailVerified" limit 1;
  if v.id is null and session_user not in ('authenticated','anonymous','authenticator') then
    select * into v from usuarios where id = 'u-00';
  end if;
  return v;
end $$;
-- aplicar_pago (0003) pasa a resolver el usuario con fn_usuario_actual():
-- ver la definición vigente en la BD; el cambio es solo la línea de resolución.
