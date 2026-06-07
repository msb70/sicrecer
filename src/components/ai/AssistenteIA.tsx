/**
 * SiCrecer — Asistente IA para Facilitadores
 * Componente React que llama a la Edge Function ai-assistant
 *
 * Uso:
 *   <AssistenteIA />
 *
 * Requiere: supabase client configurado en src/lib/supabase.ts
 */

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { supabase } from "../../lib/supabase";

// ─── TIPOS ───────────────────────────────────────────────────
interface Mensaje {
  id: string;
  rol: "user" | "assistant" | "error";
  texto: string;
  timestamp: Date;
}

// ─── SUGERENCIAS RÁPIDAS ─────────────────────────────────────
const SUGERENCIAS = [
  "¿Cuántos clientes tienen cuotas vencidas esta semana?",
  "¿Cuánto se debe en mora en mi zona?",
  "¿Quién vence más próximo en los próximos 3 días?",
  "Dame el resumen de mi cartera de hoy",
];

// ─── COMPONENTE ───────────────────────────────────────────────
export function AssistenteIA() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  // Enviar con Enter (Shift+Enter = nueva línea)
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !cargando) enviar();
    }
  }

  async function enviar(preguntaDirecta?: string) {
    const pregunta = (preguntaDirecta ?? input).trim();
    if (!pregunta || cargando) return;

    const msgUsuario: Mensaje = {
      id: crypto.randomUUID(),
      rol: "user",
      texto: pregunta,
      timestamp: new Date(),
    };

    setMensajes((prev) => [...prev, msgUsuario]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setCargando(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pregunta }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      setMensajes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          rol: "assistant",
          texto: data.respuesta,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      setMensajes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          rol: "error",
          texto: err.message ?? "Error desconocido. Intenta de nuevo.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setCargando(false);
    }
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  }

  // ─── BOTÓN FLOTANTE ─────────────────────────────────────────
  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition-all hover:-translate-y-0.5 hover:bg-rose-500 active:scale-95"
        aria-label="Abrir asistente IA"
      >
        {/* Icono espejo */}
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Asistente IA
      </button>
    );
  }

  // ─── PANEL DE CHAT ──────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60"
      style={{ maxHeight: "min(600px, calc(100dvh - 80px))" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600/20">
          <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100">Asistente de Cartera</p>
          <p className="text-xs text-zinc-500">Gemini 2.0 Flash · Solo tu zona</p>
        </div>
        <div className="flex items-center gap-1">
          {mensajes.length > 0 && (
            <button
              onClick={() => setMensajes([])}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              title="Limpiar conversación"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setAbierto(false)}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
        {mensajes.length === 0 ? (
          /* Empty state */
          <div className="space-y-4">
            <p className="text-center text-xs text-zinc-500">
              Pregúntame sobre tu cartera. Solo veo los datos de tu zona.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  disabled={cargando}
                  className="rounded-xl border border-white/8 bg-zinc-800/60 px-3 py-2.5 text-left text-xs text-zinc-300 transition-all hover:border-white/15 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.98]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {mensajes.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.rol === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                {msg.rol !== "user" && (
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl
                    ${msg.rol === "error" ? "bg-red-900/40" : "bg-rose-600/20"}`}>
                    {msg.rol === "error" ? (
                      <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-[85%] space-y-1 ${msg.rol === "user" ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                    ${msg.rol === "user"
                      ? "rounded-tr-sm bg-zinc-700 text-zinc-100"
                      : msg.rol === "error"
                      ? "rounded-tl-sm bg-red-900/30 text-red-300"
                      : "rounded-tl-sm bg-zinc-800 text-zinc-200"
                    }`}
                  >
                    <MessageText texto={msg.texto} />
                  </div>
                  <span className="px-1 text-[10px] text-zinc-600">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {cargando && (
              <div className="flex gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-600/20">
                  <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-zinc-800 px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-500 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-500 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-500 [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3">
        <div className={`flex items-end gap-2 rounded-xl border bg-zinc-800 transition-colors
          ${cargando ? "border-white/5" : "border-white/10 focus-within:border-rose-600/50"}`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={cargando}
            rows={1}
            placeholder="Escribe tu pregunta..."
            className="flex-1 resize-none bg-transparent px-3.5 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none disabled:opacity-50"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={() => enviar()}
            disabled={!input.trim() || cargando}
            className="mb-2 mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white transition-all hover:bg-rose-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-zinc-600">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}

// ─── RENDERER DE TEXTO CON FORMATO BÁSICO ────────────────────
function MessageText({ texto }: { texto: string }) {
  // Detectar listas y negrita básica
  const lines = texto.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        // Lista: línea que empieza con - o *
        if (/^[\-\*]\s/.test(line)) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-500" />
              <span>{renderBold(line.replace(/^[\-\*]\s/, ""))}</span>
            </div>
          );
        }
        // Línea vacía = separador
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i}>{renderBold(line)}</p>;
      })}
    </>
  );
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-zinc-100">
        {part}
      </strong>
    ) : (
      part
    )
  );
}
