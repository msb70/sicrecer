-- ─────────────────────────────────────────────────────────────
-- 0002 · Seed inicial (datos migrados desde los mocks del frontend)
-- Aplicado 2026-07-03. Nota: pagos y visitas conservan ids huérfanos
-- heredados de los mocks (ver comentarios de columnas en 0001).
-- ─────────────────────────────────────────────────────────────

insert into organizaciones (id, nombre, pais) values
  ('org-co-01','Fundación Crecer Colombia','CO'),
  ('org-ve-01','MicroFinanzas Venezuela','VE');

insert into usuarios (id, nombre, email, rol, zona, organizacion_id) values
  ('u-01','Ana Torres','ana@crecer.co','administrador',null,'org-co-01'),
  ('u-02','Carlos Mendez','carlos@crecer.co','coordinador','Zona Norte','org-co-01'),
  ('u-03','Luisa Ramírez','luisa@crecer.co','facilitador','Zona Norte','org-co-01'),
  ('u-04','Pedro Gómez','pedro@crecer.co','comite',null,'org-co-01'),
  ('u-05','Mario Rojas','mario@crecer.co','auditor',null,'org-co-01'),
  ('u-00','Miguel Spina','miguel.spina.busek@gmail.com','administrador',null,'org-co-01');

insert into convenios (id, cooperante, monto_total, saldo_disponible, moneda, fecha_inicio, fecha_fin, estado, pais, organizacion_id) values
  ('conv-01','Banco Mundial',200000000,142500000,'COP','2025-01-01','2026-12-31','activo','CO','org-co-01'),
  ('conv-02','USAID Colombia',80000000,71200000,'COP','2025-03-01','2026-06-30','activo','CO','org-co-01'),
  ('conv-03','CAF Venezuela',500000,48000,'UVC','2025-06-01','2026-05-31','activo','VE','org-ve-01'),
  ('conv-04','PNUD',50000000,0,'COP','2024-01-01','2025-01-01','cerrado','CO','org-co-01');

insert into bancos (id, nombre, activo) values
  ('ban-01','Bancolombia',true),('ban-02','Banco de Bogotá',true),('ban-03','Davivienda',true),
  ('ban-04','BBVA Colombia',true),('ban-05','Nequi',true),('ban-06','Daviplata',true),
  ('ban-07','Banco Popular',true),('ban-08','Efectivo / Caja',true);

insert into requisitos (id, nombre, descripcion, obligatorio) values
  ('req-01','Cédula de ciudadanía','Documento de identidad vigente (frente y reverso)',true),
  ('req-02','Carta de trabajo','Carta laboral con salario, cargo y tiempo en empresa. Vigencia máx. 30 días',false),
  ('req-03','Estados de cuenta','Últimos 3 meses de extractos bancarios',false),
  ('req-04','Foto de perfil','Foto reciente del solicitante, fondo blanco',true),
  ('req-05','Comprobante de ingresos','Declaración de renta o soporte de ingresos informales',false),
  ('req-06','Declaración de patrimonio','Listado de activos y pasivos del solicitante',false);

insert into actividades_economicas (id, nombre, descripcion, sector) values
  ('act-01','Venta de abarrotes / tienda','Comercio minorista de alimentos y productos de primera necesidad','Comercio'),
  ('act-02','Taller de carpintería','Fabricación y reparación de muebles y artículos de madera','Industria'),
  ('act-03','Confección de ropa','Diseño y producción de prendas de vestir a escala artesanal','Industria'),
  ('act-04','Venta de frutas y verduras','Comercio minorista de productos agrícolas frescos','Comercio'),
  ('act-05','Restaurante / comida','Preparación y venta de alimentos listos para consumir','Servicios'),
  ('act-06','Peluquería / estética','Servicios de belleza y cuidado personal','Servicios'),
  ('act-07','Transporte informal','Servicio de movilidad por cuenta propia (mototaxi, colectivo)','Transporte'),
  ('act-08','Construcción / albañilería','Obras civiles menores y reparaciones locativas','Construcción');

insert into productos_credito (id, convenio_id, nombre, descripcion, tasa_nominal_anual, metodo_interes, periodo_gracia_dias, plazo_min, plazo_max, monto_min, monto_max, frecuencia, requisito_ids, actividad_economica_ids) values
  ('prod-01','conv-01','Microcrédito Rural Básico','Crédito individual dirigido a microempresarios rurales. Ideal para capital de trabajo y mejora del negocio.',18,'declining_balance',0,3,12,500000,5000000,'mensual','{req-01,req-04,req-05}','{act-01,act-02,act-03,act-04}'),
  ('prod-02','conv-01','Crédito Grupal Solidario','Crédito para grupos de 4 a 8 personas con garantía solidaria. Fomenta el ahorro y la responsabilidad colectiva.',15,'flat',7,4,8,300000,2000000,'quincenal','{req-01,req-04}','{act-05,act-06,act-07}'),
  ('prod-03','conv-02','Capital Semilla Urbano','Crédito para emprendedores urbanos en etapa de arranque. Requiere plan de negocio básico.',20,'declining_balance',15,6,24,1000000,10000000,'mensual','{req-01,req-02,req-03,req-04,req-06}','{act-01,act-02,act-03,act-04,act-05,act-06,act-07,act-08}');

insert into prospectos (id, nombre, documento, telefono, email, sexo, zona, facilitador_id, estado, fecha_registro, canal_preferido, canal_captacion) values
  ('pros-01','María García','1098765432','3001234567','maria.garcia@gmail.com','F','Zona Norte','u-03','nuevo','2026-06-01','whatsapp','referido'),
  ('pros-02','José Herrera','1055432198','3109876543','jherrera@hotmail.com','M','Zona Norte','u-03','contactado','2026-05-28','llamada','visita_facilitador'),
  ('pros-03','Sandra López','1023456789','3157654321',null,'F','Zona Norte','u-03','convertido','2026-05-20','email','redes_sociales');

insert into actividades_crm (id, prospecto_id, tipo, fecha, descripcion, resultado, facilitador_id) values
  ('acrm-01','pros-01','llamada','2026-06-02','Llamada de bienvenida. Interesada en microcrédito para su tienda de abarrotes.','Programar visita la próxima semana','u-03'),
  ('acrm-02','pros-02','visita','2026-05-30','Visita al taller. Negocio de carpintería con 3 años de operación, buenas condiciones.','Solicitó que enviara estados de cuenta','u-03'),
  ('acrm-03','pros-02','whatsapp','2026-06-01','Envió fotos del taller y confirmó que mañana manda los documentos.',null,'u-03');

insert into clientes (id, nombre, documento, fecha_nacimiento, genero, actividad_economica, zona, telefono, estado, creditos_activos, total_prestado, facilitador_id) values
  ('cli-01','Rosa Martínez','1045678901','1985-04-12','F','Venta de abarrotes','Zona Norte','3204567890','activo',1,2500000,'u-03'),
  ('cli-02','Tomás Vargas','1034567890','1978-08-22','M','Taller de carpintería','Zona Norte','3012345678','al_dia',1,4000000,'u-03'),
  ('cli-03','Carmen Ruiz','1067890123','1990-11-05','F','Confección de ropa','Zona Norte','3145678901','moroso',1,1500000,'u-03'),
  ('cli-04','Alberto Núñez','1089012345','1982-02-18','M','Venta de frutas y verduras','Zona Norte','3178901234','activo',0,3000000,'u-03');

insert into solicitudes (id, cliente_id, cliente_nombre, producto_id, producto_nombre, monto_solicitado, plazo, estado, score, banda_riesgo, fecha_solicitud, facilitador_id) values
  ('sol-01','cli-01','Rosa Martínez','prod-01','Microcrédito Rural Básico',2500000,12,'aprobada',720,'B','2026-05-15','u-03'),
  ('sol-02','cli-02','Tomás Vargas','prod-03','Capital Semilla Urbano',4000000,18,'revision_comite',610,'C','2026-06-01','u-03'),
  ('sol-03','cli-03','Carmen Ruiz','prod-02','Crédito Grupal Solidario',1500000,8,'rechazada',420,'E','2026-04-10','u-03'),
  ('sol-04','cli-04','Alberto Núñez','prod-01','Microcrédito Rural Básico',3000000,12,'enviada',null,null,'2026-06-05','u-03');

insert into creditos (id, cliente_id, cliente_nombre, producto_nombre, convenio_id, fecha_desembolso, monto_desembolsado, saldo_capital, cuotas_total, cuotas_pagadas, proxima_cuota, dias_mora, estado) values
  ('cred-01','cli-01','Rosa Martínez','Microcrédito Rural Básico','conv-01','2026-03-01',2500000,1875000,12,3,'2026-06-15',0,'al_dia'),
  ('cred-02','cli-02','Tomás Vargas','Capital Semilla Urbano','conv-02','2026-02-15',4000000,3200000,18,4,'2026-06-20',0,'activo'),
  ('cred-03','cli-03','Carmen Ruiz','Crédito Grupal Solidario','conv-01','2026-03-20',1500000,900000,8,2,'2026-05-20',17,'en_mora');

insert into cobranzas (id, cliente_id, cliente_nombre, credito_id, fecha, banco, numero_deposito, monto, cuotas_aplicadas, creado_por) values
  ('cob-01','cli-01','Rosa Martínez','cred-01','2026-03-15','Bancolombia','4521-2026-001',229000,'{1}','u-03'),
  ('cob-02','cli-01','Rosa Martínez','cred-01','2026-04-15','Bancolombia','4521-2026-002',229000,'{2}','u-03'),
  ('cob-03','cli-01','Rosa Martínez','cred-01','2026-05-15','Bancolombia','4521-2026-003',229000,'{3}','u-03');

insert into pagos (id, credito_id, cuota_num, fecha, monto_capital, monto_interes, monto_total, metodo, referencia, registrado_por) values
  ('pag-001','cred-001',1,'2025-02-15',77450,22550,100000,'efectivo','EFE-001','Ana López'),
  ('pag-002','cred-001',2,'2025-03-15',79047,20953,100000,'transferencia','TRF-8821','Ana López'),
  ('pag-003','cred-001',3,'2025-04-15',80678,19322,100000,'efectivo','EFE-003','Ana López'),
  ('pag-004','cred-002',1,'2025-03-20',153333,46667,200000,'pse','PSE-4412','Pedro Ramírez');

insert into visitas (id, cliente_id, cliente_nombre, tipo, fecha, hora, zona, estado, motivo, nota) values
  ('vis-001','cli-003','Carmen Reyes','cobranza','2026-06-06','09:00','Zona Norte','pendiente','Cuota vencida hace 17 días — cobro de mora',null),
  ('vis-002','cli-001','Rosa Martínez','seguimiento','2026-06-06','10:30','Zona Norte','pendiente','Visita mensual de seguimiento — cuota 4 próxima',null),
  ('vis-003',null,'María Pérez (prospecto)','prospecto','2026-06-06','14:00','Zona Centro','pendiente','Evaluación inicial para solicitud de crédito',null),
  ('vis-004','cli-002','Tomás García','seguimiento','2026-06-06','16:00','Zona Norte','realizada','Verificación de negocio','Negocio operando con normalidad. Planea solicitar ampliación en agosto.'),
  ('vis-005',null,'Grupo Las Emprendedoras','grupo','2026-06-07','08:00','Zona Norte','pendiente','Reunión quincenal del grupo solidario',null),
  ('vis-006','cli-004','Alberto Suárez','seguimiento','2026-06-07','11:00','Zona Sur','pendiente','Verificación de crédito activo',null);

insert into kpi_reportes (id, datos) values ('actual', '{"cartera_total":1850000,"par_30":5.8,"par_90":1.2,"desembolsos_mes":420000,"num_creditos":3,"num_clientes":4,"tasa_recuperacion":94.2,"creditos_activos":2,"creditos_mora":1,"creditos_cancelados":0,"tendencia_desembolsos":[{"mes":"Ene","monto":280000},{"mes":"Feb","monto":350000},{"mes":"Mar","monto":420000},{"mes":"Abr","monto":310000},{"mes":"May","monto":490000},{"mes":"Jun","monto":420000}],"distribucion_cartera":[{"estado":"Al día","monto":1200000,"color":"#10b981"},{"estado":"Activo","monto":540000,"color":"#6366f1"},{"estado":"En mora","monto":110000,"color":"#ef4444"}],"par_zona":[{"zona":"Zona Norte","par30":4.1,"cartera":980000},{"zona":"Zona Centro","par30":8.2,"cartera":540000},{"zona":"Zona Sur","par30":2.5,"cartera":330000}]}'::jsonb);
