import { createClient } from '@supabase/supabase-js'

/**
 * Cliente único de Supabase: autenticación (Supabase Auth) + consultas a la
 * base de datos vía PostgREST (`from` / `rpc`), protegidas por RLS.
 *
 * Variables definidas en .env:
 *   VITE_SUPABASE_URL              → URL del proyecto (https://<ref>.supabase.co)
 *   VITE_SUPABASE_PUBLISHABLE_KEY  → clave publicable (anon). Es pública por diseño:
 *                                    la seguridad la impone RLS en la base de datos.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!url || !key) {
  console.warn('[supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY en .env')
}

// Sin variables (tests, modo demo) se crea un cliente inerte apuntando a un host inválido.
export const supabase = createClient(url || 'https://sin-configurar.invalid', key || 'sin-clave', {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
