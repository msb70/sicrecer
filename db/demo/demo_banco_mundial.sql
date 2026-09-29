-- ═══════════════════════════════════════════════════════════════
-- Datos DEMO — convenio Banco Mundial (conv-01)
-- Todo lo creado aquí lleva id con prefijo "demo-" (clientes, solicitudes,
-- usuarios, zonas, productos, comités) o cuelga de un cliente demo
-- (créditos, cuotas, pagos, cobranzas). Se borra con db/demo/borrar_demo.sql.
-- Los créditos se generan con el motor real: desembolsar_solicitud() y
-- aplicar_pago() en fechas pasadas; la mora sale de recalcular_mora().
-- Requiere 0013 y 0014. Ejecutar como dueño de la base (usuario efectivo u-00).
-- ═══════════════════════════════════════════════════════════════

-- ─── Facilitadores, zonas, productos y comités ────────────────
insert into usuarios (id, nombre, email, rol, zona, organizacion_id, primer_acceso) values
  ('demo-u-f1', 'Andrea Gómez',   'andrea.gomez@demo.sicrecer.com',   'facilitador', null, 'org-co-01', false),
  ('demo-u-f2', 'Julián Rojas',   'julian.rojas@demo.sicrecer.com',   'facilitador', null, 'org-co-01', false),
  ('demo-u-f3', 'Paola Castaño',  'paola.castano@demo.sicrecer.com',  'facilitador', null, 'org-co-01', false),
  ('demo-u-f4', 'Hernán Muñoz',   'hernan.munoz@demo.sicrecer.com',   'facilitador', null, 'org-co-01', false)
on conflict (id) do nothing;

insert into zonas (id, nombre, organizacion_id, facilitador_id, cobertura, descripcion) values
  ('demo-zona-usme',     'Usme',            'org-co-01', 'demo-u-f1', '{"Bogotá|Usme"}', 'Usme urbana y rural'),
  ('demo-zona-cbolivar', 'Ciudad Bolívar',  'org-co-01', 'demo-u-f2', '{"Bogotá|Ciudad Bolívar"}', 'Ciudad Bolívar urbana y rural'),
  ('demo-zona-bosa',     'Bosa – Kennedy',  'org-co-01', 'demo-u-f3', '{"Bogotá|Bosa","Bogotá|Kennedy"}', null),
  ('demo-zona-soacha',   'Soacha',          'org-co-01', 'demo-u-f4', '{"Soacha"}', null)
on conflict (id) do nothing;

insert into productos_credito (id, convenio_id, nombre, descripcion, tasa_nominal_anual, metodo_interes, periodo_gracia_dias,
  plazo_min, plazo_max, monto_min, monto_max, frecuencia, requisito_ids, actividad_economica_ids, paises, publico, activo,
  pct_servicios, pct_mora_periodo, pct_gastos_admin_periodo, dias_gracia_mora, plazos_permitidos, cobertura) values
  ('demo-prod-emprende', 'conv-01', 'Crédito Emprende', 'Capital de trabajo e inversión para negocios con más de 6 meses',
   24, 'declining_balance', 0, 1, 18, 1000000, 8000000, 'mensual', '{req-01,req-04}',
   '{act-01,act-02,act-03,act-04,act-05,act-06,act-07,act-08}', '{CO}', true, true, 7, 2, 1, 5, '{}', '{}'),
  ('demo-prod-semanal', 'conv-01', 'Capital de Trabajo Semanal', 'Cuotas semanales para comercio de rotación rápida',
   22, 'declining_balance', 0, 1, 24, 300000, 3000000, 'semanal', '{req-01,req-04}',
   '{act-01,act-02,act-03,act-04,act-05,act-06,act-07,act-08}', '{CO}', true, true, 5, 1, 0.5, 3, '{}', '{}')
on conflict (id) do nothing;

insert into comites (id, nombre, producto_id, organizacion_id, activo) values
  ('demo-comite-emprende', 'Comité Banco Mundial – Emprende', 'demo-prod-emprende', 'org-co-01', true),
  ('demo-comite-semanal',  'Comité Banco Mundial – Semanal',  'demo-prod-semanal',  'org-co-01', true),
  ('demo-comite-rural',    'Comité Banco Mundial – Rural',    'prod-01',            'org-co-01', true),
  ('demo-comite-grupal',   'Comité Banco Mundial – Grupal',   'prod-02',            'org-co-01', true)
on conflict (id) do nothing;
insert into comite_miembros (comite_id, usuario_id)
select c, u from unnest(array['demo-comite-emprende','demo-comite-semanal','demo-comite-rural','demo-comite-grupal']) c,
                 unnest(array['u-00','u-04']) u
on conflict do nothing;

-- ─── Clientes (36) ─────────────────────────────────────────────
-- zona: 1 Usme · 2 Ciudad Bolívar · 3 Bosa · 4 Kennedy · 5 Soacha (la zona y el facilitador los asigna el trigger)
insert into clientes (id, nombre, documento, fecha_nacimiento, genero, actividad_economica, actividad_economica_id,
                      telefono, estado, creditos_activos, total_prestado, pais, ciudad, localidad, direccion)
select 'demo-cli-' || lpad(n::text, 2, '0'), nom, 'DEMO-' || (52000000 + n * 7919)::text,
       date '1970-01-01' + (n * 397 % 12000), gen, ae.nombre, ae.id,
       '3' || (100000000 + n * 1234567 % 899999999)::text, 'activo', 0, 0, 'CO',
       case z when 5 then 'Soacha' else 'Bogotá' end,
       case z when 1 then 'Usme' when 2 then 'Ciudad Bolívar' when 3 then 'Bosa' when 4 then 'Kennedy' else null end,
       'Calle ' || (n * 7 % 90 + 1) || ' Sur # ' || (n * 3 % 60 + 1) || '-' || (n * 11 % 90 + 10)
from (values
  (1,'Luz Marina Pardo','F',1,'act-01'),(2,'Jhon Fredy Ruiz','M',2,'act-05'),(3,'Gloria Inés Castro','F',3,'act-03'),
  (4,'Yolanda Beltrán','F',4,'act-06'),(5,'Óscar Iván Mora','M',5,'act-02'),(6,'Deisy Carolina León','F',1,'act-06'),
  (7,'Wilson Camargo','M',2,'act-04'),(8,'Sandra Milena Ortiz','F',3,'act-05'),(9,'Nelson Parra','M',4,'act-07'),
  (10,'Diana Marcela Vega','F',5,'act-01'),(11,'Ana Lucía Rincón','F',1,'act-06'),(12,'Edwin Alfonso Díaz','M',2,'act-08'),
  (13,'Martha Cecilia Rojas','F',3,'act-04'),(14,'Fabio Nelson Cruz','M',4,'act-02'),(15,'Leidy Johana Pinto','F',5,'act-05'),
  (16,'Rubén Darío Salazar','M',1,'act-03'),(17,'Blanca Nieves Arias','F',2,'act-01'),(18,'Carmenza Quintero','F',3,'act-05'),
  (19,'Héctor Julio Téllez','M',4,'act-02'),(20,'Viviana Andrea Soto','F',5,'act-06'),(21,'María Teresa Gil','F',1,'act-07'),
  (22,'Luis Eduardo Barrera','M',2,'act-08'),(23,'Rosalba Méndez','F',3,'act-04'),(24,'Jairo Alonso Cano','M',4,'act-01'),
  (25,'Nidia Esperanza Ramos','F',5,'act-03'),(26,'Claudia Patricia Luna','F',1,'act-05'),(27,'Freddy Alexander Moreno','M',2,'act-07'),
  (28,'Olga Lucía Guzmán','F',3,'act-06'),(29,'William Enrique Pardo','M',4,'act-02'),(30,'Esperanza Cortés','F',5,'act-01'),
  (31,'Mónica Alejandra Silva','F',1,'act-03'),(32,'Pedro Pablo Acosta','M',2,'act-04'),(33,'Rocío del Pilar Niño','F',3,'act-05'),
  (34,'Germán Augusto Reyes','M',4,'act-08'),(35,'Adriana María Forero','F',5,'act-06'),(36,'Álvaro José Mendoza','M',1,'act-07')
) v(n, nom, gen, z, act)
join actividades_economicas ae on ae.id = v.act
on conflict (id) do nothing;

-- ─── Utilidades temporales (solo existen durante esta carga) ──
create or replace function pg_temp.paso(p_frec text) returns interval language sql immutable as $$
  select case p_frec when 'semanal' then interval '7 days' when 'quincenal' then interval '15 days' else interval '1 month' end $$;

-- Crea una solicitud en el estado indicado
create or replace function pg_temp.demo_sol(p_id text, p_cli text, p_prod text, p_monto numeric, p_plazo int,
  p_estado text, p_fecha date, p_proposito text) returns text language plpgsql as $$
declare c clientes%rowtype; p productos_credito%rowtype; v_com text;
begin
  select * into c from clientes where id = p_cli;
  select * into p from productos_credito where id = p_prod;
  select id into v_com from comites where producto_id = p_prod and activo limit 1;
  insert into solicitudes (id, cliente_id, cliente_nombre, producto_id, producto_nombre, monto_solicitado, plazo, estado,
    fecha_solicitud, facilitador_id, origen, pais, proposito, requisitos_confirmados, comite_id,
    enviada_comite_en, enviada_comite_por)
  values (p_id, c.id, c.nombre, p.id, p.nombre, p_monto, p_plazo, p_estado, p_fecha, c.facilitador_id, 'interno', 'CO',
    p_proposito, '["req-01","req-04"]'::jsonb,
    case when p_estado in ('revision_comite','aprobada','firma','desembolsada','rechazada') then v_com end,
    case when p_estado in ('revision_comite','aprobada','firma','desembolsada','rechazada') then (p_fecha + 3)::timestamptz end,
    case when p_estado in ('revision_comite','aprobada','firma','desembolsada','rechazada') then c.facilitador_id end);
  return p_id;
end $$;

-- Evaluación del asesor con un perfil objetivo (verde / ambar / naranja / rojo_capacidad / rojo_requisitos / reporte)
create or replace function pg_temp.demo_eval(p_sol text, p_perfil text) returns void language plpgsql as $$
declare s solicitudes%rowtype; p productos_credito%rowtype; v_pa int; v_r numeric; v_cm numeric; v_ratio numeric;
  v_flujo numeric; v_gn numeric; v_h numeric; v_o numeric := 0; v_v numeric; v_meses int; v_var text; v_cons text; v_refs int;
  v_ver boolean[]; v_comp boolean[]; v_req boolean := true; v_asesor text;
begin
  select * into s from solicitudes where id = p_sol;
  select * into p from productos_credito where id = s.producto_id;
  select facilitador_id into v_asesor from clientes where id = s.cliente_id;
  v_pa := fn_periodos_anio(p.frecuencia);
  v_r := p.tasa_nominal_anual / 100.0 / v_pa;
  v_cm := fn_cuota_frances(s.monto_solicitado, v_r, s.plazo) * v_pa / 12.0;
  case p_perfil
    when 'verde' then v_ratio := 0.17; v_meses := 62; v_var := 'estable'; v_cons := 'al_dia'; v_refs := 2;
      v_ver := array[true,true,true,true]; v_comp := array[true,true,true,false];
    when 'ambar' then v_ratio := 0.27; v_meses := 26; v_var := 'moderada'; v_cons := 'sin_historial'; v_refs := 1;
      v_ver := array[true,true,true,false]; v_comp := array[true,true,false,false];
    when 'naranja' then v_ratio := 0.37; v_meses := 10; v_var := 'alta'; v_cons := 'sin_historial'; v_refs := 1; v_o := 150000;
      v_ver := array[true,true,false,true]; v_comp := array[true,false,true,false];
    when 'reporte' then v_ratio := 0.33; v_meses := 38; v_var := 'moderada'; v_cons := 'reporte_negativo_vigente'; v_refs := 1;
      v_ver := array[true,true,true,true]; v_comp := array[true,true,false,false];
    when 'rojo_capacidad' then v_ratio := 0.62; v_meses := 8; v_var := 'alta'; v_cons := 'sin_historial'; v_refs := 0; v_o := 250000;
      v_ver := array[true,false,true,false]; v_comp := array[true,false,false,false];
    when 'rojo_requisitos' then v_ratio := 0.25; v_meses := 30; v_var := 'moderada'; v_cons := 'no_consultada'; v_refs := 1; v_req := false;
      v_ver := array[true,false,true,true]; v_comp := array[false,true,false,false];
  end case;
  v_flujo := v_cm / v_ratio;
  v_gn := round(v_flujo * 0.25, -3);
  v_h := round(v_flujo * 0.6 + 400000, -3);
  v_v := round((v_flujo + v_gn + v_h + v_o) / 0.55, -3);
  insert into evaluaciones (solicitud_id, asesor_id, fecha_visita, consentimiento_consulta, requisitos_completos, destino,
    ventas_mensuales, costo_ventas, gastos_negocio, gastos_hogar, otras_cuotas, fecha_inicio_negocio, variabilidad_ventas,
    consulta_externa, referencias_verificadas, ver_identidad, ver_ventas_soportadas, ver_referencias, ver_sin_discrepancias,
    comp_documentos, comp_citas, comp_servicios, comp_ahorro_capacitacion, evidencias, discrepancias, observaciones)
  values (s.id, v_asesor, least(s.fecha_solicitud + 2, current_date), p_perfil <> 'rojo_requisitos', v_req, s.proposito,
    v_v, round(v_v * 0.45, -3), v_gn, v_h, v_o, (s.fecha_solicitud - make_interval(months => v_meses))::date, v_var,
    v_cons, v_refs, v_ver[1], v_ver[2], v_ver[3], v_ver[4], v_comp[1], v_comp[2], v_comp[3], v_comp[4],
    case p_perfil when 'verde' then '{"Cuaderno de ventas","Facturas de proveedores","Extractos Nequi"}'::text[]
                  when 'ambar' then '{"Cuaderno de ventas","Fotos del inventario"}'::text[]
                  else '{"Declaración verbal"}'::text[] end,
    case p_perfil when 'rojo_capacidad' then 'Las ventas declaradas no coinciden con el inventario observado'
                  when 'reporte' then 'Reporte en central por obligación de telefonía (2024), cliente dice que ya pagó' else null end,
    'Carga DEMO');
end $$;

-- Paga las cuotas 1..p_hasta (solo las ya vencidas o del día) con p_atraso días de atraso, cubriendo cargos
create or replace function pg_temp.demo_pagar(p_cred text, p_hasta int, p_atraso int) returns void language plpgsql as $$
declare q record; v_f date; v_cargos numeric; v_monto numeric; v_bancos text[] := array['Bancolombia','Nequi','Davivienda','Banco de Bogotá'];
begin
  for q in select * from cronograma_cuotas where credito_id = p_cred and num <= p_hasta order by num loop
    select * into q from cronograma_cuotas where id = q.id;
    continue when q.estado = 'pagada';
    v_f := least(q.fecha_vencimiento + p_atraso, current_date);
    exit when q.fecha_vencimiento - 3 > current_date;
    perform fn_generar_cargos(p_cred, v_f);
    select coalesce(sum(monto - monto_pagado), 0) into v_cargos from cargos_atraso where credito_id = p_cred and estado = 'pendiente';
    v_monto := (q.cuota - q.monto_pagado) + v_cargos;
    perform aplicar_pago(p_cred, v_monto, v_bancos[1 + (q.num % 4)], 'DEMO-' || substr(md5(p_cred || q.num), 1, 8), v_f,
                         'demo-' || p_cred || '-' || q.num, 'transferencia');
  end loop;
end $$;

-- Crédito completo: solicitud aprobada + evaluación + desembolso + pagos
create or replace function pg_temp.demo_credito(p_sol text, p_cli text, p_prod text, p_monto numeric, p_plazo int,
  p_desembolso date, p_perfil text, p_pagadas int, p_atraso int, p_proposito text) returns text language plpgsql as $$
declare v_cred text;
begin
  perform pg_temp.demo_sol(p_sol, p_cli, p_prod, p_monto, p_plazo, 'revision_comite', p_desembolso - 12, p_proposito);
  perform pg_temp.demo_eval(p_sol, p_perfil);
  update solicitudes set estado = 'aprobada', monto_aprobado = p_monto, plazo_aprobado = p_plazo,
    fecha_decision = (p_desembolso - 4)::timestamptz, decidido_por = 'u-04' where id = p_sol;
  v_cred := (desembolsar_solicitud(p_sol, p_desembolso))->>'credito_id';
  if p_pagadas > 0 then perform pg_temp.demo_pagar(v_cred, p_pagadas, p_atraso); end if;
  return v_cred;
end $$;

-- ─── Créditos (26) ────────────────────────────────────────────
do $$
declare hoy date := current_date; m interval := interval '1 month'; s interval := interval '7 days'; q interval := interval '15 days';
begin
  -- Al día
  perform pg_temp.demo_credito('demo-sol-01','demo-cli-01','demo-prod-emprende',3000000,12,(hoy - 5*m - interval '10 days')::date,'verde',5,0,'Surtido de la tienda');
  perform pg_temp.demo_credito('demo-sol-02','demo-cli-02','demo-prod-semanal',1200000,20,(hoy - 9*s - interval '3 days')::date,'verde',9,0,'Insumos del puesto de comidas');
  perform pg_temp.demo_credito('demo-sol-03','demo-cli-03','prod-01',2500000,10,(hoy - 4*m - interval '12 days')::date,'ambar',4,0,'Máquina fileteadora');
  perform pg_temp.demo_credito('demo-sol-04','demo-cli-04','prod-02',1500000,8,(hoy - 3*q - interval '6 days')::date,'verde',3,0,'Secadores y sillas');
  perform pg_temp.demo_credito('demo-sol-05','demo-cli-05','demo-prod-emprende',4000000,18,(hoy - 7*m - interval '8 days')::date,'verde',7,0,'Herramienta eléctrica');
  perform pg_temp.demo_credito('demo-sol-06','demo-cli-06','demo-prod-semanal',800000,16,(hoy - 5*s - interval '2 days')::date,'ambar',5,0,'Productos de belleza');
  perform pg_temp.demo_credito('demo-sol-07','demo-cli-07','prod-01',1800000,12,(hoy - 8*m - interval '9 days')::date,'ambar',8,3,'Bultos de papa y cebolla');
  perform pg_temp.demo_credito('demo-sol-08','demo-cli-08','demo-prod-emprende',2000000,12,(hoy - 2*m - interval '15 days')::date,'verde',2,0,'Estufa industrial');
  -- Mora 1–30 días
  perform pg_temp.demo_credito('demo-sol-09','demo-cli-09','demo-prod-emprende',2500000,12,(hoy - 12 - 5*m)::date,'ambar',4,0,'Repuestos de moto');
  perform pg_temp.demo_credito('demo-sol-10','demo-cli-10','demo-prod-semanal',1000000,20,(hoy - 25 - 9*s)::date,'naranja',8,0,'Mercancía de temporada');
  perform pg_temp.demo_credito('demo-sol-11','demo-cli-11','prod-02',1200000,8,(hoy - 18 - 4*q)::date,'ambar',3,0,'Insumos de peluquería');
  -- Mora 31–60
  perform pg_temp.demo_credito('demo-sol-12','demo-cli-12','demo-prod-emprende',3500000,12,(hoy - 45 - 4*m)::date,'naranja',3,0,'Materiales de obra');
  perform pg_temp.demo_credito('demo-sol-13','demo-cli-13','prod-01',2000000,10,(hoy - 55 - 3*m)::date,'naranja',2,0,'Frutas y verduras al por mayor');
  -- Mora 61–90
  perform pg_temp.demo_credito('demo-sol-14','demo-cli-14','demo-prod-emprende',2200000,12,(hoy - 75 - 3*m)::date,'naranja',2,0,'Madera y herrajes');
  perform pg_temp.demo_credito('demo-sol-15','demo-cli-15','demo-prod-semanal',1500000,24,(hoy - 88 - 7*s)::date,'ambar',6,0,'Carnes y pollo');
  -- Mora > 90
  perform pg_temp.demo_credito('demo-sol-16','demo-cli-16','prod-01',1500000,12,(hoy - 120 - 2*m)::date,'naranja',1,0,'Telas');
  perform pg_temp.demo_credito('demo-sol-17','demo-cli-17','demo-prod-emprende',1000000,10,(hoy - 160 - 2*m)::date,'naranja',1,0,'Surtido de miscelánea');
  -- Por renovar (vencen en los próximos 30 días)
  perform pg_temp.demo_credito('demo-sol-18','demo-cli-18','demo-prod-emprende',2000000,10,(hoy + 10 - 10*m)::date,'verde',9,0,'Puesto de empanadas');
  perform pg_temp.demo_credito('demo-sol-19','demo-cli-19','prod-01',1500000,6,(hoy + 22 - 6*m)::date,'verde',5,0,'Taller de ornamentación');
  perform pg_temp.demo_credito('demo-sol-20','demo-cli-20','demo-prod-semanal',900000,12,(hoy + 5 - 12*s)::date,'verde',11,0,'Uñas y pestañas');
  perform pg_temp.demo_credito('demo-sol-21','demo-cli-21','prod-02',1000000,6,(hoy + 14 - 6*q)::date,'ambar',5,12,'Transporte escolar');
  -- Cancelados (recientes → renovación; uno con crédito nuevo)
  perform pg_temp.demo_credito('demo-sol-22','demo-cli-22','demo-prod-emprende',1500000,6,(hoy - 20 - 6*m)::date,'verde',6,0,'Pintura y estuco');
  perform pg_temp.demo_credito('demo-sol-23','demo-cli-23','prod-01',1200000,6,(hoy - 50 - 6*m)::date,'ambar',6,0,'Hortalizas');
  perform pg_temp.demo_credito('demo-sol-24a','demo-cli-24','demo-prod-semanal',700000,12,(hoy - 120 - 12*s)::date,'ambar',12,0,'Surtido inicial');
  perform pg_temp.demo_credito('demo-sol-24b','demo-cli-24','demo-prod-emprende',2500000,12,(hoy - 2*m - interval '5 days')::date,'verde',2,0,'Ampliación de la tienda');
  perform pg_temp.demo_credito('demo-sol-25','demo-cli-25','prod-01',1000000,6,(hoy - 200 - 6*m)::date,'ambar',6,0,'Máquina de coser');
end $$;

-- ─── Solicitudes en curso (17) ────────────────────────────────
do $$
declare hoy date := current_date;
begin
  -- Borrador
  perform pg_temp.demo_sol('demo-sol-30','demo-cli-26','demo-prod-emprende',2000000,12,'borrador',hoy - 1,'Vitrina refrigerada');
  -- Enviadas
  perform pg_temp.demo_sol('demo-sol-31','demo-cli-27','demo-prod-semanal',600000,12,'enviada',hoy - 3,'Mercancía');
  perform pg_temp.demo_sol('demo-sol-32','demo-cli-28','prod-02',1200000,8,'enviada',hoy - 6,'Implementos de belleza');
  perform pg_temp.demo_eval('demo-sol-32','verde');
  perform pg_temp.demo_sol('demo-sol-33','demo-cli-18','demo-prod-emprende',3000000,12,'enviada',hoy - 4,'Renovación: segundo punto de venta');
  perform pg_temp.demo_eval('demo-sol-33','verde');
  -- En análisis (scoring)
  perform pg_temp.demo_sol('demo-sol-34','demo-cli-29','prod-01',2200000,10,'scoring',hoy - 9,'Compresor para el taller');
  perform pg_temp.demo_eval('demo-sol-34','ambar');
  perform pg_temp.demo_sol('demo-sol-35','demo-cli-30','demo-prod-emprende',1800000,12,'scoring',hoy - 8,'Surtido de papelería');
  perform pg_temp.demo_eval('demo-sol-35','rojo_requisitos');
  perform pg_temp.demo_sol('demo-sol-36','demo-cli-22','demo-prod-emprende',2200000,12,'scoring',hoy - 7,'Renovación: más inventario');
  perform pg_temp.demo_eval('demo-sol-36','verde');
  -- En comité
  perform pg_temp.demo_sol('demo-sol-37','demo-cli-31','demo-prod-emprende',2500000,12,'revision_comite',hoy - 14,'Horno para panadería');
  perform pg_temp.demo_eval('demo-sol-37','verde');
  perform pg_temp.demo_sol('demo-sol-38','demo-cli-32','prod-01',3000000,12,'revision_comite',hoy - 12,'Nevera para la tienda');
  perform pg_temp.demo_eval('demo-sol-38','naranja');
  perform pg_temp.demo_sol('demo-sol-39','demo-cli-25','prod-01',2000000,10,'revision_comite',hoy - 11,'Renovación: fileteadora');
  perform pg_temp.demo_eval('demo-sol-39','ambar');
  perform pg_temp.demo_sol('demo-sol-40','demo-cli-33','demo-prod-semanal',1500000,20,'revision_comite',hoy - 10,'Freidora y utensilios');
  perform pg_temp.demo_eval('demo-sol-40','reporte');
  -- Aprobadas pendientes de desembolso
  perform pg_temp.demo_sol('demo-sol-41','demo-cli-34','demo-prod-emprende',3500000,12,'revision_comite',hoy - 20,'Herramienta de construcción');
  perform pg_temp.demo_eval('demo-sol-41','verde');
  update solicitudes set estado = 'aprobada', monto_aprobado = 3500000, plazo_aprobado = 12, fecha_decision = (hoy - 5)::timestamptz, decidido_por = 'u-04' where id = 'demo-sol-41';
  perform pg_temp.demo_sol('demo-sol-42','demo-cli-23','prod-01',1800000,8,'revision_comite',hoy - 16,'Renovación: invernadero');
  perform pg_temp.demo_eval('demo-sol-42','verde');
  update solicitudes set estado = 'aprobada', monto_aprobado = 1800000, plazo_aprobado = 8, fecha_decision = (hoy - 3)::timestamptz, decidido_por = 'u-04' where id = 'demo-sol-42';
  -- En firma
  perform pg_temp.demo_sol('demo-sol-43','demo-cli-35','prod-02',1500000,8,'revision_comite',hoy - 18,'Kit de manicure y sillas');
  perform pg_temp.demo_eval('demo-sol-43','ambar');
  update solicitudes set estado = 'firma', monto_aprobado = 1200000, plazo_aprobado = 8, fecha_decision = (hoy - 6)::timestamptz, decidido_por = 'u-04' where id = 'demo-sol-43';
  -- Rechazadas
  perform pg_temp.demo_sol('demo-sol-44','demo-cli-36','demo-prod-semanal',2500000,24,'revision_comite',hoy - 25,'Moto para domicilios');
  perform pg_temp.demo_eval('demo-sol-44','rojo_capacidad');
  update solicitudes set estado = 'rechazada', motivo_rechazo = 'La cuota supera el 40 % del flujo libre y las ventas no se pudieron verificar', fecha_decision = (hoy - 15)::timestamptz, decidido_por = 'u-04' where id = 'demo-sol-44';
  perform pg_temp.demo_sol('demo-sol-45','demo-cli-16','demo-prod-emprende',2000000,12,'revision_comite',hoy - 30,'Más telas');
  perform pg_temp.demo_eval('demo-sol-45','ambar');
  update solicitudes set estado = 'rechazada', motivo_rechazo = 'Crédito vigente con más de 90 días de mora', fecha_decision = (hoy - 24)::timestamptz, decidido_por = 'u-04' where id = 'demo-sol-45';
  perform pg_temp.demo_sol('demo-sol-46','demo-cli-21','prod-02',1500000,8,'revision_comite',hoy - 22,'Segunda ruta escolar');
  perform pg_temp.demo_eval('demo-sol-46','naranja');
  update solicitudes set estado = 'rechazada', motivo_rechazo = 'Pagos con atraso recurrente; se sugiere esperar al cierre del crédito actual', fecha_decision = (hoy - 12)::timestamptz, decidido_por = 'u-04' where id = 'demo-sol-46';
end $$;

-- ─── Cierre: mora al día, cobranzas al facilitador de la zona, scoring recalculado ─
select recalcular_mora();
update cobranzas cb set creado_por = c.facilitador_id
from clientes c where c.id = cb.cliente_id and c.id like 'demo-cli-%' and c.facilitador_id is not null;
select count(fn_recalcular_scoring(id)) from solicitudes where id like 'demo-sol-%';
