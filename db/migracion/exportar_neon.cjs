// Exporta public de Neon a JSONL (mismo formato que neon_20261026): valores en texto de Postgres,
// int2/int4/bool/json nativos, bytea como '\x..'. Genera _resumen.json, _esquema.json (políticas y conteos) y _auth_users.json.
// Uso: node exportar_neon.cjs <dirProyecto> <dirSalida>
const fs = require('fs'), path = require('path');
const [proyecto, salida] = process.argv.slice(2);
const S = require('./_secretos.cjs')(proyecto);
const { types } = require(path.join(proyecto, 'node_modules', 'pg'));
const crudo = (v) => v;
// date, timestamp, timestamptz, time, timetz, interval, bytea y sus arrays → texto crudo
for (const oid of [1082, 1114, 1184, 1083, 1266, 1186, 17, 1182, 1115, 1185, 1183, 1270, 1187, 1001]) types.setTypeParser(oid, crudo);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
(async () => {
  fs.mkdirSync(salida, { recursive: true, mode: 0o700 });
  const c = new S.Client(S.neon()); await c.connect();
  try {
    await c.query('begin isolation level repeatable read read only');
    const { rows: tablas } = await c.query(`select tablename from pg_tables where schemaname='public' order by 1`);
    const resumen = { exportado: new Date().toISOString(), tablas: {} };
    let total = 0;
    for (const { tablename: t } of tablas) {
      const r = await c.query(`select * from public."${t}" order by 1`);
      fs.writeFileSync(path.join(salida, t + '.jsonl'), r.rows.map(x => JSON.stringify(x)).join('\n') + (r.rows.length ? '\n' : ''), { mode: 0o600 });
      resumen.tablas[t] = { filas: r.rows.length, columnas: r.fields.map(f => f.name) };
      total += r.rows.length; log(t, r.rows.length);
    }
    const q = async (sql) => (await c.query(sql)).rows;
    const esquema = {
      politicas: await q(`select tablename, policyname, roles::text as roles, cmd, qual, with_check from pg_policies where schemaname='public' order by 1,2`),
      conteos: (await q(`select (select count(*) from pg_tables where schemaname='public')::int tablas,
        (select count(*) from pg_proc where pronamespace='public'::regnamespace)::int funciones,
        (select count(*) from pg_policies where schemaname='public')::int politicas,
        (select count(*) from pg_views where schemaname='public')::int vistas,
        (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal)::int triggers`))[0],
    };
    fs.writeFileSync(path.join(salida, '_esquema.json'), JSON.stringify(esquema, null, 1), { mode: 0o600 });
    const auth = await q(`select u.id, u.email, u.name, u."emailVerified", u."createdAt", string_agg(a."providerId", ',') as proveedores
      from neon_auth."user" u left join neon_auth.account a on a."userId" = u.id group by 1,2,3,4,5 order by 5`);
    fs.writeFileSync(path.join(salida, '_auth_users.json'), JSON.stringify(auth, null, 1), { mode: 0o600 });
    fs.writeFileSync(path.join(salida, '_resumen.json'), JSON.stringify(resumen, null, 1), { mode: 0o600 });
    await c.query('commit');
    log(`export OK: ${tablas.length} tablas, ${total} filas, ${auth.length} usuarios auth →`, salida);
  } finally { await c.end(); }
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
