import { createClient } from '@neondatabase/neon-js'

/**
 * Cliente único de Neon: autenticación (Neon Auth / Better Auth)
 * + consultas a la base de datos vía Data API (PostgREST).
 *
 * Variables definidas en .env:
 *   VITE_NEON_AUTH_URL      → Base URL de Neon Auth
 *   VITE_NEON_DATA_API_URL  → URL del Data API
 */
export const neon = createClient({
  auth: {
    url: import.meta.env.VITE_NEON_AUTH_URL as string,
  },
  dataApi: {
    url: import.meta.env.VITE_NEON_DATA_API_URL as string,
  },
})
