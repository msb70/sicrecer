-- ═══════════════════════════════════════════════════════════════
-- Borra todos los datos DEMO (ids con prefijo "demo-" y lo que cuelga
-- de clientes demo). Devuelve al convenio el capital desembolsado.
-- El audit_log conserva el rastro (es inmutable).
-- ═══════════════════════════════════════════════════════════════
create temp table _demo_creditos on commit drop as
  select id, convenio_id, monto_desembolsado from creditos where cliente_id like 'demo-%';

update convenios cv set saldo_disponible = saldo_disponible + t.total
from (select convenio_id, sum(monto_desembolsado) total from _demo_creditos group by convenio_id) t
where cv.id = t.convenio_id;

delete from cargos_atraso where credito_id in (select id from _demo_creditos);
delete from pagos where credito_id in (select id from _demo_creditos);
delete from cobranzas where credito_id in (select id from _demo_creditos) or cliente_id like 'demo-%';
delete from cronograma_cuotas where credito_id in (select id from _demo_creditos);
delete from creditos where id in (select id from _demo_creditos);
delete from comite_votos where solicitud_id like 'demo-%';
delete from evaluaciones where solicitud_id like 'demo-%';
delete from solicitudes where id like 'demo-%';
delete from visitas where cliente_id like 'demo-%';
delete from prospectos where id like 'demo-%';
delete from clientes where id like 'demo-%';
delete from comite_miembros where comite_id like 'demo-%';
delete from comites where id like 'demo-%';
delete from productos_credito where id like 'demo-%';
delete from zonas where id like 'demo-%';
delete from usuarios where id like 'demo-%';
