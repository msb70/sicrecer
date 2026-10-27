// Compara Neon vs Supabase tabla a tabla: conteo + md5 del contenido (filas como texto, ordenadas).
// Además compara usuarios de Neon Auth contra auth.users de Supabase. Sale con código 1 si hay diferencias.
// Uso: node checksums.cjs <dirProyecto>
const S = require('./_secretos.cjs')(process.argv[2]);
const sumas = async (c) => {
  const { rows: ts } = await c.query(`select tablename from pg_tables where schemaname='public' order by 1`);
  const out = {};
  for (const { tablename: t } of ts) {
    const { rows: [r] } = await c.query(`select count(*)::int n, coalesce(md5(string_agg(x::text, '|' order by x::text)), '-') h from public."${t}" x`);
    out[t] = r;
  }
  return out;
};
(async () => {
  const n = new S.Client(S.neon()), s = new S.Client(S.supabase());
  await n.connect(); await s.connect();
  try {
    const [a, b] = await Promise.all([sumas(n), sumas(s)]);
    let iguales = 0, malas = [];
    for (const t of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[t] && b[t] && a[t].n === b[t].n && a[t].h === b[t].h) iguales++;
      else malas.push(`${t}: neon ${a[t]?.n ?? 'NO EXISTE'} / supabase ${b[t]?.n ?? 'NO EXISTE'}${a[t] && b[t] && a[t].n === b[t].n ? ' (mismo conteo, contenido distinto)' : ''}`);
    }
    console.log(`tablas idénticas: ${iguales}/${iguales + malas.length}`); malas.forEach(m => console.log('  DIFERENTE', m));
    const nu = (await n.query(`select lower(email) e from neon_auth."user" where "emailVerified"`)).rows.map(r => r.e);
    const su = new Set((await s.query(`select lower(email) e from auth.users`)).rows.map(r => r.e));
    const faltan = nu.filter(e => !su.has(e));
    console.log(`usuarios Neon Auth verificados: ${nu.length}; faltan en Supabase: ${faltan.length ? faltan.join(', ') : 'ninguno'}`);
    if (malas.length || faltan.length) process.exitCode = 1;
  } finally { await n.end(); await s.end(); }
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
