// Mora diaria de SiCrecer (Neon Function, slug "moradiaria").
// Ejecuta select recalcular_mora(): genera cargos por atraso (gastos
// administrativos y mora) y actualiza estado/días de atraso de los créditos.
// Invocada por un Function Trigger programado (una vez al día).
// Desplegada sin bundle: el zip contiene este archivo como index.mjs.
async function sql(query) {
  const url = new URL(process.env.DATABASE_URL)
  const res = await fetch(`https://${url.hostname}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': process.env.DATABASE_URL },
    body: JSON.stringify({ query, params: [] }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`SQL ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return (await res.json()).rows
}
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })
export default {
  async fetch(req) {
    if (req.method === 'GET') return json({ ok: true, servicio: 'mora-diaria-sicrecer' })
    if (req.method !== 'POST') return json({ error: 'método no permitido' }, 405)
    if (!req.headers.get('x-neon-trigger-invocation-id')) return json({ error: 'no autorizado' }, 403)
    try {
      const t0 = Date.now()
      await sql('select recalcular_mora()')
      const [r] = await sql(`select count(*) filter (where estado = 'en_mora')::int as en_mora, count(*)::int as activos from creditos where estado not in ('cancelado','castigado')`)
      console.log(`recalcular_mora ok en ${Date.now() - t0} ms: ${JSON.stringify(r)}`)
      return json({ ok: true, ...r })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`recalcular_mora: ${msg}`)
      return json({ ok: false, error: msg }, 500)
    }
  },
}
