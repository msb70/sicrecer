// ─── Notificador de SiCrecer (Neon Function) ─────────────────
// Vacía el outbox `notificaciones` enviando emails vía Resend.
// Se invoca por un Function Trigger programado (cada 5 min) o por POST manual
// con `Authorization: Bearer $NOTIFICADOR_SECRET`.
// Variables: DATABASE_URL (inyectada por Neon), RESEND_API_KEY, EMAIL_FROM
// (p. ej. "SiCrecer <notificaciones@sicrecer.com>"; el dominio debe estar
// verificado en Resend). Sin dependencias: usa el endpoint SQL-over-HTTP de Neon.

const LOTE = 25
const MAX_INTENTOS = 5

interface Notificacion { id: number; destinatario: string; asunto: string; cuerpo: string; intentos: number }

/** Consulta SQL parametrizada vía el endpoint HTTP de Neon (mismo que @neondatabase/serverless). */
async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const url = new URL(process.env.DATABASE_URL!)
  const res = await fetch(`https://${url.hostname}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': process.env.DATABASE_URL!,
      'Neon-Raw-Text-Output': 'true',
      'Neon-Array-Mode': 'false',
    },
    body: JSON.stringify({ query, params }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`SQL ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = await res.json() as { rows: T[] }
  return json.rows
}

async function enviarResend(n: Notificacion): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [n.destinatario], subject: n.asunto, text: n.cuerpo }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

async function pendientesCount(): Promise<number> {
  const [r] = await sql<{ count: string }>(`select count(*)::int as count from notificaciones where estado = 'pendiente'`)
  return Number(r?.count ?? 0)
}

async function procesar() {
  const configurado = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
  if (!configurado) {
    // Sin proveedor de email: no consumir intentos; el outbox espera.
    return { enviadas: 0, errores: 0, pendientes: await pendientesCount(), configurado }
  }
  const lote = await sql<Notificacion>(
    `select id, destinatario, asunto, cuerpo, intentos from notificaciones
     where estado = 'pendiente' and intentos < $1 order by id limit $2`, [MAX_INTENTOS, LOTE])
  let enviadas = 0, errores = 0
  for (const n of lote) {
    try {
      await enviarResend(n)
      await sql(`update notificaciones set estado = 'enviada', enviado_en = now(), intentos = intentos + 1, error = null where id = $1`, [n.id])
      enviadas++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const agotado = Number(n.intentos) + 1 >= MAX_INTENTOS
      await sql(`update notificaciones set intentos = intentos + 1, error = $2, estado = $3 where id = $1`, [n.id, msg, agotado ? 'error' : 'pendiente'])
      errores++
      console.error(`notificacion ${n.id}: ${msg}`)
    }
  }
  return { enviadas, errores, pendientes: await pendientesCount(), configurado }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === 'GET') return json({ ok: true, servicio: 'notificador-sicrecer' })
    if (req.method !== 'POST') return json({ error: 'método no permitido' }, 405)
    // Invocación programada (Neon añade X-Neon-Trigger-Invocation-Id) o manual con secreto.
    const esTrigger = Boolean(req.headers.get('x-neon-trigger-invocation-id'))
    const secreto = process.env.NOTIFICADOR_SECRET
    const auth = req.headers.get('authorization')
    if (!esTrigger && !(secreto && auth === `Bearer ${secreto}`)) return json({ error: 'no autorizado' }, 403)
    try {
      const r = await procesar()
      console.log(`notificador: enviadas=${r.enviadas} errores=${r.errores} pendientes=${r.pendientes} configurado=${r.configurado}`)
      return json({ ok: true, ...r })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`notificador: ${msg}`)
      return json({ ok: false, error: msg }, 500)
    }
  },
}
