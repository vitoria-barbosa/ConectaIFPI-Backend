import { randomUUID } from "crypto";
import { AreaConhecimento, Coorganizador, Evento } from "../tipos/index";
import {
  converterParaCamelCase,
  converterParaSnakeCase,
} from "../utils/conversaoCampos";
import {
  criarClienteSupabaseAutenticado,
  supabase,
} from "../config/supabaseClient";

const BUCKET_FOTOS_EVENTOS = "fotos-eventos";

export async function listarEventosServidor(filtros?: {
  area?: AreaConhecimento;
  busca?: string;
}): Promise<Evento[]> {
  let consulta = supabase.from("eventos").select("*");
  if (filtros?.area) consulta = consulta.eq("area_conhecimento", filtros.area);

  const { data, error } = await consulta;
  if (error) {
    throw new Error("Não foi possível listar os eventos.");
  }
  const eventos = converterParaCamelCase<Evento[]>(data ?? []);
  const termo = filtros?.busca?.trim().toLocaleLowerCase("pt-BR");
  return termo
    ? eventos.filter(
        (evento) =>
          evento.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
          evento.descricao.toLocaleLowerCase("pt-BR").includes(termo),
      )
    : eventos;
}

export async function buscarEventoServidor(id: string): Promise<Evento | null> {
  const { data, error } = await supabase
    .from("eventos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível buscar o evento.");
  return data ? converterParaCamelCase<Evento>(data) : null;
}

export async function criarEventoServidor(
  evento: Omit<Evento, "id" | "coorganizadoresIds">,
  foto: Buffer,
  extensao: "jpg" | "png" | "webp",
  token: string,
): Promise<Evento> {
  const cliente = criarClienteSupabaseAutenticado(token);
  const { data: eventoCriado, error: erroCriacao } = await cliente
    .from("eventos")
    .insert([
      {
        ...converterParaSnakeCase<Record<string, unknown>>(evento),
        foto_capa_url: "",
      },
    ])
    .select()
    .single();
  if (erroCriacao || !eventoCriado) {
    console.error("[Evento] Falha ao cadastrar o evento:", erroCriacao);
    throw new Error("Não foi possível cadastrar o evento.");
  }

  const caminhoFoto = `${eventoCriado.id}/${randomUUID()}.${extensao}`;
  let fotoEnviada = false;
  try {
    const { error: erroUpload } = await cliente.storage
      .from(BUCKET_FOTOS_EVENTOS)
      .upload(caminhoFoto, foto, {
        contentType: obterTipoMimeImagem(extensao),
        upsert: false,
      });
    if (erroUpload) throw erroUpload;
      fotoEnviada = true;

    const { data, error } = await cliente
      .from("eventos")
      .update({ foto_capa_url: caminhoFoto })
      .eq("id", eventoCriado.id)
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Evento não encontrado.");

    return converterParaCamelCase<Evento>(data);
  } catch (erro) {
    if (fotoEnviada) await removerObjetoStorage(cliente, caminhoFoto);
    const { error: erroExclusao } = await cliente
      .from("eventos")
      .delete()
      .eq("id", eventoCriado.id);
    if (erroExclusao) {
      console.error(
        "[Evento] Não foi possível remover o cadastro após falha no envio da foto:",
        erroExclusao,
      );
    }
    console.error("[Evento] Falha ao salvar o evento com sua foto:", erro);
    throw new Error("Não foi possível cadastrar o evento com a foto enviada.");
  }
}

export async function atualizarEventoServidor(
  id: string,
  alteracoes: Partial<Omit<Evento, "id" | "coorganizadoresIds">>,
  token: string,
): Promise<Evento | null> {
  const { data, error } = await criarClienteSupabaseAutenticado(token)
    .from("eventos")
    .update(converterParaSnakeCase<Record<string, unknown>>(alteracoes))
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) {
    console.error("[Evento] Falha ao persistir alterações do evento:", error);
    throw new Error("Não foi possível atualizar o evento.");
  }
  return data ? converterParaCamelCase<Evento>(data) : null;
}

export async function atualizarFotoEventoServidor(
  id: string,
  foto: Buffer,
  extensao: "jpg" | "png" | "webp",
  token: string,
): Promise<Evento | null> {
  const cliente = criarClienteSupabaseAutenticado(token);
  const eventoAtual = await buscarEventoServidor(id);
  if (!eventoAtual) return null;

  const caminhoNovaFoto = `${id}/${randomUUID()}.${extensao}`;
  const { error: erroUpload } = await cliente.storage
    .from(BUCKET_FOTOS_EVENTOS)
    .upload(caminhoNovaFoto, foto, {
      contentType: obterTipoMimeImagem(extensao),
      upsert: false,
    });
  if (erroUpload) {
    console.error("[Evento] Falha ao enviar a nova foto:", erroUpload);
    throw new Error("Não foi possível enviar a nova foto do evento.");
  }

  const { data, error } = await cliente
    .from("eventos")
    .update({ foto_capa_url: caminhoNovaFoto })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error || !data) {
    await removerObjetoStorage(cliente, caminhoNovaFoto);
    if (error) {
      console.error("[Evento] Falha ao atualizar o caminho da foto:", error);
    }
    if (error) throw new Error("Não foi possível atualizar a foto do evento.");
    return null;
  }

  if (caminhoFotoStorageValido(eventoAtual.fotoCapaUrl)) {
    await removerObjetoStorage(cliente, eventoAtual.fotoCapaUrl);
  }
  return converterParaCamelCase<Evento>(data);
}

export async function adicionarCoorganizadorServidor(
  id: string,
  email: string,
  token: string,
): Promise<Evento | null> {
  const eventoAtual = await buscarEventoServidor(id);
  if (!eventoAtual) return null;

  const { data, error: erroEvento } = await criarClienteSupabaseAutenticado(
    token,
  )
    .from("eventos")
    .update({
      coorganizadores_ids: [...eventoAtual.coorganizadoresIds, email],
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (erroEvento) {
    if (erroEvento.code === "23514") {
      throw new Error(
        "Não existe um aluno cadastrado com esse e-mail institucional.",
      );
    }
    if (erroEvento.code === "42501") {
      throw new Error(
        "Somente o organizador principal pode adicionar coorganizadores.",
      );
    }
    if (erroEvento.code === "23505") {
      throw new Error(
        "Este estudante já faz parte da comissão organizadora deste evento.",
      );
    }
    console.error("[Evento] Falha ao atualizar coorganizadores:", erroEvento);
    throw new Error("Não foi possível adicionar o coorganizador.");
  }

  if (!data) {
    throw new Error(
      "Somente o organizador principal pode adicionar coorganizadores.",
    );
  }

  return converterParaCamelCase<Evento>(data);
}

export async function listarCoorganizadoresServidor(
  eventoId: string,
  token: string,
): Promise<Coorganizador[]> {
  const { data, error } = await criarClienteSupabaseAutenticado(token).rpc(
    "listar_coorganizadores_evento",
    { p_evento_id: eventoId },
  );
  if (error) {
    console.error("[Evento] Falha ao listar coorganizadores:", error);
    throw new Error("Não foi possível listar os coorganizadores.");
  }

  return (data ?? []).map(
    (coorganizador: { id: string; nome: string }) => ({
      id: coorganizador.id,
      nome: coorganizador.nome,
    }),
  );
}

export async function removerCoorganizadorServidor(
  eventoId: string,
  coorganizadorId: string,
  token: string,
): Promise<boolean> {
  const { data, error } = await criarClienteSupabaseAutenticado(token).rpc(
    "remover_coorganizador_evento",
    {
      p_evento_id: eventoId,
      p_coorganizador_id: coorganizadorId,
    },
  );
  if (error) {
    console.error("[Evento] Falha ao remover coorganizador:", error);
    throw new Error("Não foi possível remover o coorganizador.");
  }

  return data === true;
}

export async function excluirEventoServidor(
  evento: Evento,
  token: string,
): Promise<void> {
  const cliente = criarClienteSupabaseAutenticado(token);
  if (caminhoFotoStorageValido(evento.fotoCapaUrl)) {
    const fotoRemovida = await removerObjetoStorage(
      cliente,
      evento.fotoCapaUrl,
    );
    if (!fotoRemovida) {
      throw new Error("Não foi possível remover a foto do evento.");
    }
  }

  const { data, error } = await cliente
    .from("eventos")
    .delete()
    .eq("id", evento.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) {
      console.error("[Evento] Falha ao excluir o evento:", error);
    }
    throw new Error("Não foi possível excluir o evento.");
  }
}

function caminhoFotoStorageValido(caminho: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(
    caminho,
  );
}

async function removerObjetoStorage(
  cliente: ReturnType<typeof criarClienteSupabaseAutenticado>,
  caminho: string,
): Promise<boolean> {
  if (!caminhoFotoStorageValido(caminho)) return true;
  const { error } = await cliente.storage
    .from(BUCKET_FOTOS_EVENTOS)
    .remove([caminho]);
  if (error) {
    console.error("[Evento] Não foi possível remover a foto do Storage:", error);
    return false;
  }
  return true;
}

function obterTipoMimeImagem(extensao: "jpg" | "png" | "webp"): string {
  if (extensao === "jpg") return "image/jpeg";
  return `image/${extensao}`;
}
