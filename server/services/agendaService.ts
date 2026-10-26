import { ItemAgenda } from "../tipos/index";
import { criarClienteSupabaseAutenticado } from "../config/supabaseClient";
import {
  converterParaCamelCase,
  converterParaSnakeCase,
} from "../utils/conversaoCampos";

export async function listarFavoritosServidor(
  usuarioId: string,
  token: string,
): Promise<ItemAgenda[]> {
  const { data, error } = await criarClienteSupabaseAutenticado(token)
    .from("itens_agenda")
    .select("*")
    .eq("usuario_id", usuarioId);
  if (error) throw new Error("Não foi possível listar os favoritos.");
  return converterParaCamelCase<ItemAgenda[]>(data ?? []);
}

export async function criarFavoritoServidor(
  usuarioId: string,
  eventoId: string,
  token: string,
): Promise<ItemAgenda> {
  const existente = (await listarFavoritosServidor(usuarioId, token)).find(
    (item) => item.eventoId === eventoId,
  );
  if (existente) return existente;

  const { data, error } = await criarClienteSupabaseAutenticado(token)
    .from("itens_agenda")
    .insert([
      converterParaSnakeCase<Record<string, unknown>>({ usuarioId, eventoId }),
    ])
    .select()
    .single();
  if (error) throw new Error("Não foi possível salvar o favorito.");
  return converterParaCamelCase<ItemAgenda>(data);
}

export async function excluirFavoritoServidor(
  usuarioId: string,
  eventoId: string,
  token: string,
): Promise<boolean> {
  const { data, error } = await criarClienteSupabaseAutenticado(token)
    .from("itens_agenda")
    .delete()
    .eq("usuario_id", usuarioId)
    .eq("evento_id", eventoId)
    .select("id");
  if (error) throw new Error("Não foi possível remover o favorito.");
  return Boolean(data?.length);
}
