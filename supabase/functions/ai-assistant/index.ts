/**
 * SiCrecer — Edge Function: Asistente IA para Facilitadores
 * Modelo: Gemini 2.0 Flash (Google)
 *
 * Configurar en Supabase Dashboard → Settings → Edge Functions → Secrets:
 *   GEMINI_API_KEY = tu clave de Google AI Studio
 *
 * Deploy:
 *   supabase functions deploy ai-assistant --no-verify-jwt
 *
 * El JWT se verifica en el código (rol facilitador requerido).
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── SYSTEM PROMPT ───────────────────────────────────────────
const SYSTEM_PROMPT = `
Eres el asistente interno de SiCrecer, un sistema de microcréditos.
Tu rol: responder preguntas de los facilitadores de campo sobre su cartera.

REGLAS ESTRICTAS:
- Responde solo con la información del CONTEXTO que te entrego. No inventes datos.
- Si no tienes el dato, dilo claramente: "Esa información no está en tu cartera actual."
- Responde en español, lenguaje simple y directo. Los facilitadores no son técnicos.
- Para montos, usa formato local: Bs. o $ según la moneda del convenio.
- Fechas en formato DD/MM/AAAA.
- Si hay mora, indícala con urgencia clara.
- Máximo 3 párrafos o una lista corta. No te extiendas.
`.trim();

// ─── HANDLER ─────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // 1. Verificar JWT y extraer usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("No autorizado", 401);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return errorResponse("Token inválido", 401);
    }

    // 2. Parsear body
    const { pregunta } = await req.json() as { pregunta: string };

    if (!pregunta?.trim()) {
      return errorResponse("La pregunta no puede estar vacía", 400);
    }
    if (pregunta.length > 500) {
      return errorResponse("Pregunta demasiado larga (máx. 500 caracteres)", 400);
    }

    // 3. Supabase con service role para leer datos
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 4. Cargar perfil del facilitador y su zona
    const { data: perfil, error: perfilError } = await supabase
      .from("users")
      .select(
        `id, full_name, role,
         zones ( id, name, country )`
      )
      .eq("auth_user_id", user.id)
      .single();

    if (perfilError || !perfil) {
      return errorResponse("Facilitador no encontrado en el sistema", 404);
    }

    if (!["facilitador", "coordinador_zonal", "administrador"].includes(perfil.role)) {
      return errorResponse("Rol sin acceso al asistente", 403);
    }

    const zonaId = perfil.zones?.id;
    const zonaNombre = perfil.zones?.name ?? "sin zona asignada";

    // 5. Contexto: préstamos activos de la zona
    const { data: prestamos } = await supabase
      .from("loans")
      .select(
        `id,
         clients ( full_name, document_id ),
         disbursements ( amount, currency_code ),
         repayment_schedule (
           installment_no, due_date, status,
           principal, interest, fees, paid_amount, paid_at
         )`
      )
      .eq("zone_id", zonaId)
      .in("status", ["active", "overdue"])
      .order("created_at", { ascending: false })
      .limit(60);

    // 6. Contexto: cuotas en mora en la zona
    const hoy = new Date().toISOString().split("T")[0];
    const { data: cuotasMora } = await supabase
      .from("repayment_schedule")
      .select(
        `id, due_date, principal, interest, fees,
         loans (
           id,
           clients ( full_name ),
           zone_id
         )`
      )
      .eq("status", "overdue")
      .lte("due_date", hoy)
      .eq("loans.zone_id", zonaId)
      .order("due_date", { ascending: true })
      .limit(30);

    // 7. Estadísticas rápidas de cartera
    const totalPrestamos = prestamos?.length ?? 0;
    const totalMora = cuotasMora?.length ?? 0;
    const montoMora = cuotasMora?.reduce(
      (sum, c) => sum + Number(c.principal ?? 0) + Number(c.interest ?? 0) + Number(c.fees ?? 0) - Number(c.paid_amount ?? 0),
      0
    ) ?? 0;

    // 8. Próximas cuotas (7 días)
    const en7Dias = new Date();
    en7Dias.setDate(en7Dias.getDate() + 7);
    const proximasCuotas = prestamos
      ?.flatMap((p: any) =>
        (p.repayment_schedule ?? [])
          .filter((c: any) => c.status === "pending" && c.due_date <= en7Dias.toISOString().split("T")[0])
          .map((c: any) => ({
            cliente: p.clients?.full_name,
            cuota: c.installment_no,
            vence: c.due_date,
            monto: Number(c.principal) + Number(c.interest) + Number(c.fees),
          }))
      )
      .slice(0, 10) ?? [];

    // 9. Construir contexto textual para Gemini
    const contexto = buildContexto({
      facilitador: perfil.full_name,
      zona: zonaNombre,
      totalPrestamos,
      totalMora,
      montoMora,
      prestamos: prestamos ?? [],
      cuotasMora: cuotasMora ?? [],
      proximasCuotas,
      hoy,
    });

    // 10. Llamar a Gemini 2.0 Flash
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `CONTEXTO DE LA CARTERA:\n${contexto}\n\nPREGUNTA:\n${pregunta}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 800,
            topP: 0.8,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          ],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error("Gemini error:", errBody);
      return errorResponse("Error al consultar el modelo de IA", 502);
    }

    const geminiData = await geminiRes.json();
    const respuesta =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No pude generar una respuesta. Intenta reformular la pregunta.";

    // 11. Registrar en audit_log (sin guardar la respuesta — solo el evento)
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "ai_assistant_query",
      entity: "ai_assistant",
      new_value: { zona_id: zonaId, pregunta_length: pregunta.length },
    });

    return new Response(JSON.stringify({ respuesta }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return errorResponse("Error interno del servidor", 500);
  }
});

// ─── HELPERS ─────────────────────────────────────────────────

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function buildContexto(data: {
  facilitador: string;
  zona: string;
  totalPrestamos: number;
  totalMora: number;
  montoMora: number;
  prestamos: any[];
  cuotasMora: any[];
  proximasCuotas: any[];
  hoy: string;
}): string {
  const lines: string[] = [
    `Facilitador: ${data.facilitador}`,
    `Zona: ${data.zona}`,
    `Fecha actual: ${data.hoy}`,
    `Total préstamos activos en tu zona: ${data.totalPrestamos}`,
    `Cuotas en mora: ${data.totalMora}`,
    `Monto total en mora: ${data.montoMora.toFixed(2)}`,
    "",
  ];

  if (data.cuotasMora.length > 0) {
    lines.push("CLIENTES CON CUOTAS EN MORA:");
    for (const c of data.cuotasMora.slice(0, 15)) {
      const monto =
        Number(c.principal ?? 0) +
        Number(c.interest ?? 0) +
        Number(c.fees ?? 0) -
        Number(c.paid_amount ?? 0);
      lines.push(
        `  - ${c.loans?.clients?.full_name ?? "Sin nombre"} | vencida: ${c.due_date} | debe: ${monto.toFixed(2)}`
      );
    }
    lines.push("");
  }

  if (data.proximasCuotas.length > 0) {
    lines.push("CUOTAS QUE VENCEN EN LOS PRÓXIMOS 7 DÍAS:");
    for (const c of data.proximasCuotas) {
      lines.push(
        `  - ${c.cliente} | cuota #${c.cuota} | vence: ${c.vence} | monto: ${Number(c.monto).toFixed(2)}`
      );
    }
    lines.push("");
  }

  if (data.prestamos.length > 0) {
    lines.push("LISTA DE PRÉSTAMOS ACTIVOS EN TU ZONA:");
    for (const p of data.prestamos.slice(0, 20)) {
      const desembolso = p.disbursements?.[0];
      const cuotasPendientes = (p.repayment_schedule ?? []).filter(
        (c: any) => c.status === "pending"
      ).length;
      const cuotasMora = (p.repayment_schedule ?? []).filter(
        (c: any) => c.status === "overdue"
      ).length;
      lines.push(
        `  - ${p.clients?.full_name ?? "Sin nombre"} (CI: ${p.clients?.document_id ?? "N/D"})` +
          ` | monto: ${Number(desembolso?.amount ?? 0).toFixed(2)} ${desembolso?.currency_code ?? ""}` +
          ` | cuotas pendientes: ${cuotasPendientes}` +
          (cuotasMora > 0 ? ` | EN MORA: ${cuotasMora} cuota(s)` : "")
      );
    }
  }

  return lines.join("\n");
}
