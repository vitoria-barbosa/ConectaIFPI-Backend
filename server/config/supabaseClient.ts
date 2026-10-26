import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabaseEstaConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

let clienteSupabaseServidor: SupabaseClient;

if (supabaseEstaConfigurado) {
  try {
    clienteSupabaseServidor = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    throw new Error("[Supabase Servidor]: Erro ao inicializar cliente");
  }
} else {
  throw new Error(
    "[Supabase Servidor]: Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY não configuradas",
  );
}

export const supabase = clienteSupabaseServidor;

export function criarClienteSupabaseAutenticado(token: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (input, init) => {
        const cabecalhos = new Headers(init?.headers);
        cabecalhos.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers: cabecalhos });
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
