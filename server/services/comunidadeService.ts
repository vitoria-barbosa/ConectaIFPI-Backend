import { ComunicadoOficial, DuvidaComunidade } from "../tipos/index";
import { converterParaSnakeCase } from "../utils/conversaoCampos";
import {
  criarClienteSupabaseAutenticado,
  supabase,
} from "../config/supabaseClient";

type NovoComunicado = Omit<ComunicadoOficial, "id" | "criadoEm">;
type NovaDuvida = Omit<
  DuvidaComunidade,
  | "id"
  | "criadoEm"
  | "resposta"
  | "respondidoPorNome"
  | "respondidoPorId"
  | "respondidoEm"
>;

export async function listarComunicadosServidor(
  eventoId: string,
): Promise<ComunicadoOficial[]> {
  const { data, error } = await supabase
    .from("comunicados_oficiais")
    .select("*")
    .eq("evento_id", eventoId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error("Não foi possível listar os comunicados.");
  return (data ?? []).map((item) => ({
    id: item.id,
    eventoId: item.evento_id,
    autorId: item.autor_id,
    autorNome: item.autor_nome,
    autorPapel: item.autor_papel,
    mensagem: item.mensagem,
    criadoEm: item.criado_em,
  }));
}

export async function criarComunicadoServidor(
  dados: NovoComunicado,
  token: string,
): Promise<ComunicadoOficial> {
  const { data, error } = await criarClienteSupabaseAutenticado(token)
    .from("comunicados_oficiais")
    .insert([converterParaSnakeCase<Record<string, unknown>>(dados)])
    .select()
    .single();
  if (error) throw new Error("Não foi possível publicar o comunicado.");
  return {
    id: data.id,
    eventoId: data.evento_id,
    autorId: data.autor_id,
    autorNome: data.autor_nome,
    autorPapel: data.autor_papel,
    mensagem: data.mensagem,
    criadoEm: data.criado_em,
  };
}

export async function buscarComunicadoServidor(
  id: string,
): Promise<ComunicadoOficial | null> {
  const { data, error } = await supabase
    .from("comunicados_oficiais")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível buscar o comunicado.");
  return data
    ? {
        id: data.id,
        eventoId: data.evento_id,
        autorId: data.autor_id,
        autorNome: data.autor_nome,
        autorPapel: data.autor_papel,
        mensagem: data.mensagem,
        criadoEm: data.criado_em,
      }
    : null;
}

export async function atualizarComunicadoServidor(
  id: string,
  alteracoes: Pick<ComunicadoOficial, "mensagem">,
  token: string,
): Promise<ComunicadoOficial | null> {
  const { data, error } = await criarClienteSupabaseAutenticado(token)
    .from("comunicados_oficiais")
    .update(converterParaSnakeCase<Record<string, unknown>>(alteracoes))
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new Error("Não foi possível atualizar o comunicado.");
  return data
    ? {
        id: data.id,
        eventoId: data.evento_id,
        autorId: data.autor_id,
        autorNome: data.autor_nome,
        autorPapel: data.autor_papel,
        mensagem: data.mensagem,
        criadoEm: data.criado_em,
      }
    : null;
}

export async function excluirComunicadoServidor(
  id: string,
  token: string,
): Promise<boolean> {
  const { data, error } = await criarClienteSupabaseAutenticado(token)
    .from("comunicados_oficiais")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Não foi possível excluir o comunicado.");
  return Boolean(data?.id);
}

export async function listarDuvidasServidor(
  eventoId: string,
): Promise<DuvidaComunidade[]> {
  const { data, error } = await supabase
    .from("duvidas_comunidade")
    .select("*")
    .eq("evento_id", eventoId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error("Não foi possível listar as dúvidas.");
  return (data ?? []).map((item) => ({
    id: item.id,
    eventoId: item.evento_id,
    autorId: item.autor_id,
    autorNome: item.autor_nome,
    autorEmail: item.autor_email,
    pergunta: item.pergunta,
    resposta: item.resposta,
    respondidoPorNome: item.respondido_por_nome,
    respondidoPorId: item.respondido_por_id,
    respondidoEm: item.respondido_em,
    criadoEm: item.criado_em,
  }));
}

export async function criarDuvidaServidor(
  dados: NovaDuvida,
  token: string,
): Promise<DuvidaComunidade> {
  const { data, error } = await criarClienteSupabaseAutenticado(token)
    .from("duvidas_comunidade")
    .insert([converterParaSnakeCase<Record<string, unknown>>(dados)])
    .select()
    .single();
  if (error) throw new Error("Não foi possível enviar a dúvida.");
  return {
    id: data.id,
    eventoId: data.evento_id,
    autorId: data.autor_id,
    autorNome: data.autor_nome,
    autorEmail: data.autor_email,
    pergunta: data.pergunta,
    resposta: data.resposta,
    respondidoPorNome: data.respondido_por_nome,
    respondidoPorId: data.respondido_por_id,
    respondidoEm: data.respondido_em,
    criadoEm: data.criado_em,
  };
}

export async function buscarDuvidaServidor(
  id: string,
): Promise<DuvidaComunidade | null> {
  const { data, error } = await supabase
    .from("duvidas_comunidade")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível buscar a dúvida.");
  return data
    ? {
        id: data.id,
        eventoId: data.evento_id,
        autorId: data.autor_id,
        autorNome: data.autor_nome,
        autorEmail: data.autor_email,
        pergunta: data.pergunta,
        resposta: data.resposta,
        respondidoPorNome: data.respondido_por_nome,
        respondidoPorId: data.respondido_por_id,
        respondidoEm: data.respondido_em,
        criadoEm: data.criado_em,
      }
    : null;
}

export async function atualizarDuvidaServidor(
  id: string,
  alteracoes: Partial<
    Pick<
      DuvidaComunidade,
      | "pergunta"
      | "resposta"
      | "respondidoPorNome"
      | "respondidoPorId"
      | "respondidoEm"
    >
  >,
  token: string,
): Promise<DuvidaComunidade | null> {
  const { data, error } = await criarClienteSupabaseAutenticado(token)
    .from("duvidas_comunidade")
    .update(converterParaSnakeCase<Record<string, unknown>>(alteracoes))
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new Error("Não foi possível atualizar a dúvida.");
  return data
    ? {
        id: data.id,
        eventoId: data.evento_id,
        autorId: data.autor_id,
        autorNome: data.autor_nome,
        autorEmail: data.autor_email,
        pergunta: data.pergunta,
        resposta: data.resposta,
        respondidoPorNome: data.respondido_por_nome,
        respondidoPorId: data.respondido_por_id,
        respondidoEm: data.respondido_em,
        criadoEm: data.criado_em,
      }
    : null;
}

export async function excluirDuvidaServidor(
  id: string,
  token: string,
): Promise<boolean> {
  const { data, error } = await criarClienteSupabaseAutenticado(token)
    .from("duvidas_comunidade")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Não foi possível excluir a dúvida.");
  return Boolean(data?.id);
}
