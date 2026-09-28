-- 0012 — Correcciones de las pruebas E2E del 2026-09-28
--  D-02: el comité valida el plazo aprobado con la regla 1..máximo (fn_plazo_valido),
--        no con plazo_min/plazo_max; todos los productos quedan con plazo_min = 1.
--  D-03: el desembolso exige convenio activo con saldo suficiente y descuenta del
--        saldo_disponible el monto total del crédito (lo colocado contra el fondo).
-- Después de aplicar: refrescar la caché del Data API (ver db/README.md).

update productos_credito set plazo_min = 1 where plazo_min is distinct from 1;

CREATE OR REPLACE FUNCTION public.votar_solicitud(p_solicitud_id text, p_decision text, p_comentario text DEFAULT NULL::text, p_monto numeric DEFAULT NULL::numeric, p_plazo integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'neon_auth', 'auth'
AS $function$
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
    if not public.fn_plazo_valido(v_p, v_plazo) then
      raise exception 'Plazo aprobado fuera del rango del producto (de 1 a % cuotas)', public.fn_max_cuotas(v_p);
    end if;
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
    select coalesce(monto_propuesto, v_s.monto_solicitado), coalesce(plazo_propuesto, v_s.plazo) into v_monto, v_plazo
    from comite_votos where solicitud_id = p_solicitud_id and decision = 'aprobado' order by fecha desc limit 1;
    v_resultado := 'aprobada';
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
end $function$;

CREATE OR REPLACE FUNCTION public.desembolsar_solicitud(p_solicitud_id text, p_fecha_desembolso date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'neon_auth', 'auth'
AS $function$
declare
  v_u usuarios; v_s solicitudes%rowtype; p productos_credito%rowtype; v_st solicitantes%rowtype;
  v_existente text; v_conv convenios%rowtype; v_id text; v_monto numeric; v_plazo int; v_serv numeric; v_entregado numeric; v_cuota numeric; v_primera date;
begin
  v_u := public.fn_usuario_actual();
  if v_u.id is null or v_u.rol not in ('administrador', 'coordinador') then
    raise exception 'Solo administrador o coordinador pueden registrar desembolsos';
  end if;
  if p_fecha_desembolso is null then raise exception 'La fecha de desembolso es obligatoria'; end if;

  select * into v_s from solicitudes where id = p_solicitud_id for update;
  if not found then raise exception 'Solicitud % no existe', p_solicitud_id; end if;

  select id into v_existente from creditos where solicitud_id = p_solicitud_id;
  if found then return jsonb_build_object('duplicado', true, 'credito_id', v_existente); end if;

  if v_s.estado not in ('aprobada', 'firma') then
    raise exception 'Solo se desembolsan solicitudes aprobadas (estado actual: %)', v_s.estado;
  end if;
  if v_s.cliente_id is null then raise exception 'La solicitud no tiene cliente asociado'; end if;

  select * into p from productos_credito where id = v_s.producto_id;
  if not found then raise exception 'Producto % no existe', v_s.producto_id; end if;

  v_monto := coalesce(v_s.monto_aprobado, v_s.monto_solicitado);
  v_plazo := coalesce(v_s.plazo_aprobado, v_s.plazo);
  if v_monto < coalesce(p.monto_min, 0) or v_monto > coalesce(p.monto_max, v_monto) then
    raise exception 'Monto % fuera del rango del producto (% – %)', v_monto, p.monto_min, p.monto_max;
  end if;
  if not public.fn_plazo_valido(p, v_plazo) then
    raise exception 'Plazo de % cuotas no permitido para el producto', v_plazo;
  end if;

  -- Fondo del convenio: debe estar activo y con saldo suficiente (0012)
  select * into v_conv from convenios where id = p.convenio_id for update;
  if found then
    if v_conv.estado <> 'activo' then raise exception 'El convenio % no está activo', v_conv.cooperante; end if;
    if coalesce(v_conv.saldo_disponible, 0) < v_monto then
      raise exception 'Saldo insuficiente en el convenio % (disponible %, requerido %)', v_conv.cooperante, v_conv.saldo_disponible, v_monto;
    end if;
  end if;

  v_serv := round(v_monto * p.pct_servicios / 100);
  v_entregado := v_monto - v_serv;
  v_id := 'cred-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');

  insert into creditos (id, cliente_id, cliente_nombre, producto_nombre, convenio_id, fecha_desembolso,
                        monto_desembolsado, saldo_capital, cuotas_total, cuotas_pagadas, dias_mora, estado,
                        producto_id, tasa_nominal_anual, metodo_interes, frecuencia, solicitud_id,
                        pct_servicios, monto_servicios, monto_entregado,
                        pct_mora_periodo, pct_gastos_admin_periodo, dias_gracia_mora)
  values (v_id, v_s.cliente_id, v_s.cliente_nombre, p.nombre, p.convenio_id, p_fecha_desembolso,
          v_monto, v_monto, v_plazo, 0, 0, 'al_dia',
          p.id, p.tasa_nominal_anual, 'declining_balance', p.frecuencia, v_s.id,
          p.pct_servicios, v_serv, v_entregado,
          p.pct_mora_periodo, p.pct_gastos_admin_periodo, p.dias_gracia_mora);

  update convenios set saldo_disponible = saldo_disponible - v_monto where id = p.convenio_id;

  perform public.generar_cronograma(v_id);
  perform public.fn_actualizar_estado_credito(v_id);

  update solicitudes set estado = 'desembolsada' where id = v_s.id;
  update clientes set creditos_activos = creditos_activos + 1, total_prestado = total_prestado + v_monto
  where id = v_s.cliente_id;

  select cuota_actual, proxima_cuota into v_cuota, v_primera from creditos where id = v_id;

  if v_s.solicitante_id is not null then
    select * into v_st from solicitantes where id = v_s.solicitante_id;
    if found then
      insert into notificaciones (destinatario, asunto, cuerpo, tipo, referencia) values (
        v_st.email, '[SiCrecer] Tu crédito fue desembolsado',
        format('Hola %s,%s%sTu crédito %s fue desembolsado el %s.%sMonto del crédito: %s%sServicios de desarrollo empresarial (%s%%): %s%sMonto entregado: %s%sCuota: %s (%s), primera cuota el %s.',
               v_st.nombre, E'\n', E'\n', p.nombre, to_char(p_fecha_desembolso, 'DD/MM/YYYY'), E'\n',
               v_monto, E'\n', p.pct_servicios, v_serv, E'\n', v_entregado, E'\n', v_cuota, p.frecuencia, to_char(v_primera, 'DD/MM/YYYY')),
        'desembolso', v_id);
    end if;
  end if;

  return jsonb_build_object('credito_id', v_id, 'monto_credito', v_monto, 'monto_servicios', v_serv,
                            'monto_entregado', v_entregado, 'cuota', v_cuota, 'primera_cuota', v_primera,
                            'plazo', v_plazo);
end $function$;
