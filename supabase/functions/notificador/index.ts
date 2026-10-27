// ─── Notificador de SiCrecer (Supabase Edge Function) ────────
// Vacía el outbox `notificaciones` enviando emails vía Resend.
// Se invoca desde pg_cron (cada 5 min, vía pg_net) o manualmente con
// `Authorization: Bearer $NOTIFICADOR_SECRET`.
// Secretos (Edge Function Secrets): RESEND_API_KEY, EMAIL_FROM, NOTIFICADOR_SECRET.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const LOTE = 25
const MAX_INTENTOS = 5

interface Notificacion { id: number; destinatario: string; asunto: string; cuerpo: string; intentos: number }

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function enviarResend(n: Notificacion): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('EMAIL_FROM'), to: [n.destinatario], subject: n.asunto, text: n.cuerpo }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

async function pendientesCount(): Promise<number> {
  const { count, error } = await db.from('notificaciones').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente')
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function procesar() {
  const configurado = Boolean(Deno.env.get('RESEND_API_KEY') && Deno.env.get('EMAIL_FROM'))
  if (!configurado) return { enviadas: 0, errores: 0, pendientes: await pendientesCount(), configurado }
  const { data: lote, error } = await db.from('notificaciones')
    .select('id, destinatario, asunto, cuerpo, intentos')
    .eq('estado', 'pendiente').lt('intentos', MAX_INTENTOS).order('id').limit(LOTE)
  if (error) throw new Error(error.message)
  let enviadas = 0, errores = 0
  for (const n of (lote ?? []) as Notificacion[]) {
    try {
      await enviarResend(n)
      await db.from('notificaciones').update({ estado: 'enviada', enviado_en: new Date().toISOString(), intentos: n.intentos + 1, error: null }).eq('id', n.id)
      enviadas++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const agotado = n.intentos + 1 >= MAX_INTENTOS
      await db.from('notificaciones').update({ intentos: n.intentos + 1, error: msg, estado: agotado ? 'error' : 'pendiente' }).eq('id', n.id)
      errores++
      console.error(`notificacion ${n.id}: ${msg}`)
    }
  }
  return { enviadas, errores, pendientes: await pendientesCount(), configurado }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'GET') return json({ ok: true, servicio: 'notificador-sicrecer' })
  if (req.method !== 'POST') return json({ error: 'método no permitido' }, 405)
  const secreto = Deno.env.get('NOTIFICADOR_SECRET')
  const auth = req.headers.get('authorization')
  if (!secreto || auth !== `Bearer ${secreto}`) return json({ error: 'no autorizado' }, 403)
  try {
    const r = await procesar()
    console.log(`notificador: enviadas=${r.enviadas} errores=${r.errores} pendientes=${r.pendientes} configurado=${r.configurado}`)
    return json({ ok: true, ...r })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`notificador: ${msg}`)
    return json({ ok: false, error: msg }, 500)
  }
})
