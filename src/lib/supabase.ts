import { createClient } from "@supabase/supabase-js";

// Valores placeholder para evitar que la app crashee al importar
// este módulo cuando las variables no están definidas (el asistente
// IA es el único consumidor y es opcional).
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
