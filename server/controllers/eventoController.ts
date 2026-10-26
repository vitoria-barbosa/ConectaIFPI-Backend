import { Request, Response } from "express";
import { AreaConhecimento, Evento } from "../tipos/index";
import { RequisicaoAutenticada } from "../middlewares/autenticacao";
import {
  atualizarEventoServidor,
  atualizarFotoEventoServidor,
  adicionarCoorganizadorServidor,
  buscarEventoServidor,
  criarEventoServidor,
  excluirEventoServidor,
  listarCoorganizadoresServidor,
  listarEventosServidor,
  removerCoorganizadorServidor,
} from "../services/eventoService";

const AREAS_CONHECIMENTO: AreaConhecimento[] = [
  "Tecnologia",
  "Gestão",
  "Licenciaturas",
  "Indústria",
  "Saúde",
  "Outro",
  "Cultura",
];

const CAMPOS_EVENTO = [
  "nome",
  "descricao",
  "areaConhecimento",
  "local",
  "dataHoraInicioInscricoes",
  "dataHoraTerminoInscricoes",
  "dataHoraInicio",
  "dataHoraTermino",
  "fotoCapaUrl",
  "cargaHoraria",
  "tipoEvento",
  "possuiVagasOrganizacao",
  "linkInscricaoSuap",
  "linkEventoSuap",
  "organizadorId",
  "organizadorNome",
  "organizadorEmail",
] as const satisfies readonly (keyof Evento)[];

const CAMPOS_EVENTO_ATUALIZAVEIS = CAMPOS_EVENTO.filter(
  (campo) => campo !== "organizadorId",
);

export async function listar(req: Request, res: Response) {
  try {
    const area =
      typeof req.query.area === "string" ? req.query.area : undefined;
    if (
      area &&
      area !== "Todos" &&
      !AREAS_CONHECIMENTO.includes(area as AreaConhecimento)
    ) {
      return res.status(400).json({
        sucesso: false,
        erro: "A área de conhecimento informada é inválida.",
      });
    }
    const busca =
      typeof req.query.busca === "string" ? req.query.busca : undefined;
    const dados = await listarEventosServidor({
      area:
        area === "Todos" ? undefined : (area as AreaConhecimento | undefined),
      busca,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch {
    return responderErroServidor(res);
  }
}

export async function buscarPorId(req: Request, res: Response) {
  try {
    const evento = await buscarEventoServidor(req.params.id);
    if (!evento) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Evento não encontrado." });
    }
    return res.status(200).json({ sucesso: true, dados: evento });
  } catch {
    return responderErroServidor(res);
  }
}

export async function criar(req: RequisicaoAutenticada, res: Response) {
  if (!objetoValido(req.body)) {
    return res
      .status(400)
      .json({ sucesso: false, erro: "Envie os dados do evento." });
  }
  if (!req.file) {
    return res
      .status(400)
      .json({ sucesso: false, erro: "Envie a foto de capa do evento." });
  }

  const extensao = obterExtensaoImagem(req.file.buffer);
  if (!extensao) {
    return res.status(415).json({
      sucesso: false,
      erro: "A foto deve ser uma imagem JPG, PNG ou WebP válida.",
    });
  }

  const camposNormalizados = { ...req.body };
  if (typeof camposNormalizados.cargaHoraria === "string") {
    camposNormalizados.cargaHoraria = Number(camposNormalizados.cargaHoraria);
  }
  for (const campo of ["possuiVagasOrganizacao"]) {
    if (camposNormalizados[campo] === "true") {
      camposNormalizados[campo] = true;
    } else if (camposNormalizados[campo] === "false") {
      camposNormalizados[campo] = false;
    }
  }

  const evento = filtrarCamposEvento({
    ...camposNormalizados,
    fotoCapaUrl: "upload-pendente",
  });

  const erroValidacao = validarEvento(evento);
  if (erroValidacao) {
    return res.status(400).json({ sucesso: false, erro: erroValidacao });
  }

  const token = obterTokenRequisicao(req);
  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: "A sessão do usuário é inválida ou expirou.",
    });
  }

  try {
    const dados = await criarEventoServidor(
      evento as Omit<Evento, "id" | "coorganizadoresIds">,
      req.file.buffer,
      extensao,
      token,
    );
    return res
      .location(`/api/eventos/${encodeURIComponent(dados.id)}`)
      .status(201)
      .json({ sucesso: true, dados });
  } catch {
    return responderErroServidor(res);
  }
}

export async function atualizar(req: RequisicaoAutenticada, res: Response) {
  if (!objetoValido(req.body)) {
    return res
      .status(400)
      .json({ sucesso: false, erro: "Envie os campos para atualização." });
  }
  const alteracoes = filtrarCamposEvento(
    req.body,
    CAMPOS_EVENTO_ATUALIZAVEIS,
  );
  if ("fotoCapaUrl" in alteracoes) {
    return res.status(400).json({
      sucesso: false,
      erro: "A foto de capa deve ser enviada como arquivo.",
    });
  }
  if (Object.keys(alteracoes).length === 0) {
    return res
      .status(400)
      .json({ sucesso: false, erro: "Nenhum campo válido para atualizar." });
  }
  const erroValidacao = validarEvento(alteracoes, true);
  if (erroValidacao) {
    return res.status(400).json({ sucesso: false, erro: erroValidacao });
  }

  const token = obterTokenRequisicao(req);
  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: "A sessão do usuário é inválida ou expirou.",
    });
  }

  try {
    const eventoAtual = await buscarEventoServidor(req.params.id);
    if (!eventoAtual) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Evento não encontrado." });
    }
    if (
      req.eventoCoorganizador &&
      ["organizadorId", "organizadorNome", "organizadorEmail"].some(
        (campo) =>
          campo in alteracoes &&
          alteracoes[campo as keyof typeof alteracoes] !==
            eventoAtual[campo as keyof Evento],
      )
    ) {
      return res.status(403).json({
        sucesso: false,
        erro: "Coorganizadores não podem alterar os dados do organizador principal.",
      });
    }
    const dadosCompletos = { ...eventoAtual, ...alteracoes };
    const erroEventoCompleto = validarEvento(dadosCompletos);
    if (erroEventoCompleto) {
      return res.status(400).json({ sucesso: false, erro: erroEventoCompleto });
    }
    const dados = await atualizarEventoServidor(
      req.params.id,
      alteracoes,
      token,
    );
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error("[Evento] Falha ao atualizar o evento:", erro);
    return responderErroServidor(res);
  }
}

export async function atualizarFoto(req: RequisicaoAutenticada, res: Response) {
  if (!req.file) {
    return res
      .status(400)
      .json({ sucesso: false, erro: "Envie a nova foto de capa do evento." });
  }

  const extensao = obterExtensaoImagem(req.file.buffer);
  if (!extensao) {
    return res.status(415).json({
      sucesso: false,
      erro: "A foto deve ser uma imagem JPG, PNG ou WebP válida.",
    });
  }

  const token = obterTokenRequisicao(req);
  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: "A sessão do usuário é inválida ou expirou.",
    });
  }

  try {
    const evento = await buscarEventoServidor(req.params.id);
    if (!evento) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Evento não encontrado." });
    }

    const atualizado = await atualizarFotoEventoServidor(
      evento.id,
      req.file.buffer,
      extensao,
      token,
    );
    if (!atualizado) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Evento não encontrado." });
    }

    return res.status(200).json({ sucesso: true, dados: atualizado });
  } catch {
    return responderErroServidor(res);
  }
}

export async function adicionarCoorganizador(
  req: RequisicaoAutenticada,
  res: Response,
) {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  if (!email.endsWith("@aluno.ifpi.edu.br")) {
    return res.status(400).json({
      sucesso: false,
      erro: "Informe um e-mail institucional válido de aluno (@aluno.ifpi.edu.br).",
    });
  }

  try {
    const autorizacao = req.headers.authorization ?? "";
    const [esquema, token] = autorizacao.split(" ");
    if (esquema?.toLowerCase() !== "bearer" || !token) {
      return res.status(401).json({
        sucesso: false,
        erro: "A sessão do usuário é inválida ou expirou.",
      });
    }

    const evento = await adicionarCoorganizadorServidor(
      req.params.id,
      email,
      token,
    );

    if (!evento) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Evento não encontrado." });
    }

    return res.status(200).json({ sucesso: true, dados: evento });
  } catch (erro) {
    if (erro instanceof Error) {
      if (erro.message.includes("já faz parte")) {
        return res.status(409).json({ sucesso: false, erro: erro.message });
      }
      if (erro.message.includes("aluno cadastrado")) {
        return res.status(404).json({ sucesso: false, erro: erro.message });
      }
      if (erro.message.includes("organizador principal")) {
        return res.status(403).json({ sucesso: false, erro: erro.message });
      }
    }
    return responderErroServidor(res);
  }
}

export async function listarCoorganizadores(
  req: RequisicaoAutenticada,
  res: Response,
) {
  const token = obterTokenRequisicao(req);
  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: "A sessão do usuário é inválida ou expirou.",
    });
  }

  try {
    const evento = await buscarEventoServidor(req.params.id);
    if (!evento) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Evento não encontrado." });
    }
    if (evento.organizadorId !== req.usuario?.id) {
      return res.status(403).json({
        sucesso: false,
        erro: "Somente o organizador principal pode listar os coorganizadores.",
      });
    }

    const dados = await listarCoorganizadoresServidor(req.params.id, token);
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error("[Evento] Falha ao listar coorganizadores:", erro);
    return responderErroServidor(res);
  }
}

export async function removerCoorganizador(
  req: RequisicaoAutenticada,
  res: Response,
) {
  const token = obterTokenRequisicao(req);
  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: "A sessão do usuário é inválida ou expirou.",
    });
  }

  try {
    const evento = await buscarEventoServidor(req.params.id);
    if (!evento) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Evento não encontrado." });
    }
    if (evento.organizadorId !== req.usuario?.id) {
      return res.status(403).json({
        sucesso: false,
        erro: "Somente o organizador principal pode remover coorganizadores.",
      });
    }

    const removido = await removerCoorganizadorServidor(
      req.params.id,
      req.params.coorganizadorId,
      token,
    );
    if (!removido) {
      return res.status(404).json({
        sucesso: false,
        erro: "Esse usuário não está na lista de coorganizadores do evento.",
      });
    }
    return res.status(204).send();
  } catch (erro) {
    console.error("[Evento] Falha ao remover coorganizador:", erro);
    return responderErroServidor(res);
  }
}

function obterTokenRequisicao(req: Request): string | null {
  const autorizacao = req.headers.authorization ?? "";
  const [esquema, token] = autorizacao.split(" ");
  return esquema?.toLowerCase() === "bearer" && token ? token : null;
}

export async function excluir(req: RequisicaoAutenticada, res: Response) {
  try {
    const token = obterTokenRequisicao(req);
    if (!token) {
      return res.status(401).json({
        sucesso: false,
        erro: "A sessão do usuário é inválida ou expirou.",
      });
    }

    const evento = await buscarEventoServidor(req.params.id);
    if (!evento) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Evento não encontrado." });
    }

    if (evento.organizadorId !== req.usuario?.id) {
      return res.status(403).json({
        sucesso: false,
        erro: "Somente o organizador principal pode excluir o evento.",
      });
    }

    await excluirEventoServidor(evento, token);
    return res.status(204).send();
  } catch {
    return responderErroServidor(res);
  }
}

function objetoValido(valor: unknown): valor is Record<string, unknown> {
  return Boolean(valor && typeof valor === "object" && !Array.isArray(valor));
}

function filtrarCamposEvento(
  payload: Record<string, unknown>,
  camposPermitidos: readonly (keyof Evento)[] = CAMPOS_EVENTO,
): Partial<Omit<Evento, "id" | "coorganizadoresIds">> {
  return Object.fromEntries(
    Object.entries(payload).filter(([campo]) =>
      camposPermitidos.includes(campo as keyof Evento),
    ),
  );
}

function validarEvento(
  dados: Partial<Omit<Evento, "id" | "coorganizadoresIds">>,
  parcial = false,
): string | null {
  const obrigatorios = parcial ? Object.keys(dados) : CAMPOS_EVENTO;
  if (
    obrigatorios.some((campo) => {
      const valor = dados[campo as keyof typeof dados];
      return valor === undefined || valor === null || valor === "";
    })
  ) {
    return "Preencha os campos obrigatórios do evento.";
  }

  if (
    dados.areaConhecimento !== undefined &&
    !AREAS_CONHECIMENTO.includes(dados.areaConhecimento)
  ) {
    return "A área de conhecimento informada é inválida.";
  }
  if (
    dados.tipoEvento !== undefined &&
    dados.tipoEvento !== "Aberto ao público" &&
    dados.tipoEvento !== "Interno"
  ) {
    return "O tipo de evento informado é inválido.";
  }
  if (
    dados.cargaHoraria !== undefined &&
    (typeof dados.cargaHoraria !== "number" || dados.cargaHoraria <= 0)
  ) {
    return "A carga horária deve ser maior que zero.";
  }
  if (
    dados.possuiVagasOrganizacao !== undefined &&
    typeof dados.possuiVagasOrganizacao !== "boolean"
  ) {
    return "O campo de vagas devem ser booleano.";
  }
  if (
    dados.dataHoraInicio !== undefined &&
    dados.dataHoraTermino !== undefined &&
    new Date(dados.dataHoraTermino) <= new Date(dados.dataHoraInicio)
  ) {
    return "O término do evento deve ser posterior ao início.";
  }
  if (
    dados.dataHoraInicioInscricoes !== undefined &&
    dados.dataHoraTerminoInscricoes !== undefined &&
    new Date(dados.dataHoraTerminoInscricoes) <=
      new Date(dados.dataHoraInicioInscricoes)
  ) {
    return "O término das inscrições deve ser posterior ao início.";
  }

  for (const url of [dados.linkInscricaoSuap, dados.linkEventoSuap]) {
    if (url === undefined) continue;
    try {
      if (new URL(url).protocol !== "https:") {
        return "Os links do evento devem usar HTTPS.";
      }
    } catch {
      return "Um dos links do evento é inválido.";
    }
  }
  return null;
}

function obterExtensaoImagem(buffer: Buffer): "jpg" | "png" | "webp" | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

function responderErroServidor(res: Response, erro?: unknown): Response {
  return res.status(500).json({
    sucesso: false,
    erro:
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao processar a operação do evento.",
  });
}
