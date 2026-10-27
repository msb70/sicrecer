// Congela (o descongela) las escrituras de la app en Neon. Guarda el estado previo en .sicrecer/neon_grants_pre_corte.json.
// Uso: node congelar_neon.cjs <dirProyecto> congelar|descongelar
const fs = require('fs'), path = require('path');
const [proyecto, accion] = process.argv.slice(2);
const S = require('./_secretos.cjs')(proyecto);
const estado = path.join(proyecto, '.sicrecer', 'neon_grants_pre_corte.json');
const RPC_ESCRITURA = ['aplicar_pago','desembolsar_solicitud','enviar_a_comite','votar_solicitud','fn_scoring_fem','cerrar_mes','reabrir_mes',
  'generar_cronograma','fn_recalcular_scoring','recalcular_mora','fn_registrar_cierre','fn_generar_cargos','fn_actualizar_estado_credito','fn_reprogramar_tras_anticipo'];
(async () => {
  const c = new S.Client(S.neon()); await c.connect();
  try {
    if (accion === 'congelar') {
      const tablas = (await c.query(`select table_name, grantee, privilege_type from information_schema.role_table_grants
        where table_schema='public' and grantee in ('authenticated','anonymous','PUBLIC') and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')`)).rows;
      const funcs = (await c.query(`select p.oid::regprocedure::text as firma, p.proacl::text as acl from pg_proc p
        where p.pronamespace='public'::regnamespace and p.proname = any($1)`, [RPC_ESCRITURA])).rows;
      if (!fs.existsSync(estado)) fs.writeFileSync(estado, JSON.stringify({ guardado: new Date().toISOString(), tablas, funcs }, null, 1), { mode: 0o600 });
      await c.query('begin');
      await c.query(`revoke insert, update, delete, truncate on all tables in schema public from authenticated, anonymous, public`);
      for (const f of funcs) await c.query(`revoke execute on function ${f.firma} from public, authenticated, anonymous`);
      await c.query('commit');
      console.log(`congelado: ${tablas.length} grants DML revocados, ${funcs.length} RPCs de escritura sin EXECUTE. Estado previo en ${estado}`);
    } else if (accion === 'descongelar') {
      const { tablas, funcs } = JSON.parse(fs.readFileSync(estado, 'utf8'));
      await c.query('begin');
      for (const g of tablas) await c.query(`grant ${g.privilege_type} on public."${g.table_name}" to ${g.grantee === 'PUBLIC' ? 'public' : g.grantee}`);
      for (const f of funcs) {
        const acl = f.acl || '';
        if (!f.acl || /(^|[{,])=X/.test(acl)) await c.query(`grant execute on function ${f.firma} to public`);
        for (const r of ['authenticated', 'anonymous']) if (new RegExp(`[{,]${r}=[^,}]*X`).test(acl)) await c.query(`grant execute on function ${f.firma} to ${r}`);
      }
      await c.query('commit');
      console.log(`descongelado: ${tablas.length} grants DML y ${funcs.length} RPCs restaurados`);
    } else throw new Error('acción: congelar | descongelar');
    // Prueba: una escritura como authenticated debe fallar si está congelado
    await c.query('begin'); 
    try { await c.query('set local role authenticated'); await c.query(`update public.bancos set nombre = nombre where false`); console.log('prueba escritura authenticated: PERMITIDA'); }
    catch (e) { console.log('prueba escritura authenticated: DENEGADA →', e.message); }
    await c.query('rollback');
  } finally { await c.end(); }
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
