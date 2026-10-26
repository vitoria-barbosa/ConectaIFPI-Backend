import { Request, Response } from "express";
import { ComunicadoOficial, DuvidaComunidade, Evento } from "../tipos/index";
import { RequisicaoAutenticada } from "../middlewares/autenticacao";
import {
  atualizarComunicadoServidor,
  atualizarDuvidaServidor,
  buscarComunicadoServidor,
  buscarDuvidaServidor,
  criarComunicadoServidor,
  criarDuvidaServidor,
  excluirComunicadoServidor,
  excluirDuvidaServidor,
  listarComunicadosServidor,
  listarDuvidasServidor,
} from "../services/comunidadeService";
import { buscarEventoServidor } from "../services/eventoService";

function enviarErroServidor(res: Response): void {
  res.status(500).json({
    sucesso: false,
    erro: "Ocorreu um erro ao processar a operação da comunidade.",
  });
}

function usuarioValido(req: RequisicaoAutenticada, res: Response) {
  if (!req.usuario) {
    res.status(401).json({ sucesso: false, erro: "Autenticação necessária." });
    return null;
  }
  return req.usuario;
}

function tokenValido(req: RequisicaoAutenticada, res: Response) {
  if (!req.tokenAutenticacao) {
    res.status(401).json({
      sucesso: false,
      erro: "A sessão do usuário é inválida ou expirou.",
    });
    return null;
  }
  return req.tokenAutenticacao;
}

async function obterEvento(
  eventoId: string,
  res: Response,
): Promise<Evento | null> {
  const evento = await buscarEventoServidor(eventoId);
  if (!evento) {
    res.status(404).json({ sucesso: false, erro: "Evento não encontrado." });
    return null;
  }
  return evento;
}

function fazParteDaOrganizacao(
  usuario: NonNullable<RequisicaoAutenticada["usuario"]>,
  evento: Evento,
): boolean {
  return (
    usuario.id === evento.organizadorId ||
    evento.coorganizadoresIds.includes(usuario.id)
  );
}

async function verificarOrganizacao(
  req: RequisicaoAutenticada,
  res: Response,
  eventoId: string,
): Promise<{
  usuario: NonNullable<RequisicaoAutenticada["usuario"]>;
  evento: Evento;
} | null> {
  const usuario = usuarioValido(req, res);
  if (!usuario) return null;
  const evento = await obterEvento(eventoId, res);
  if (!evento) return null;
  if (!fazParteDaOrganizacao(usuario, evento)) {
    res.status(403).json({
      sucesso: false,
      erro: "Somente a organização do evento pode realizar esta operação.",
    });
    return null;
  }
  return { usuario, evento };
}

export async function listarComunicados(req: Request, res: Response) {
  try {
    const dados = await listarComunicadosServidor(req.params.eventoId);
    return res.status(200).json({ sucesso: true, dados });
  } catch {
    return enviarErroServidor(res);
  }
}

export async function criarComunicado(
  req: RequisicaoAutenticada,
  res: Response,
) {
  if (typeof req.body?.mensagem !== "string" || !req.body.mensagem.trim()) {
    return res.status(400).json({
      sucesso: false,
      erro: "A mensagem do comunicado não pode estar vazia.",
    });
  }

  try {
    const acesso = await verificarOrganizacao(req, res, req.params.eventoId);
    if (!acesso) return;
    const token = tokenValido(req, res);
    if (!token) return;
    const dados = await criarComunicadoServidor({
      eventoId: acesso.evento.id,
      autorId: acesso.usuario.id,
      autorNome: acesso.usuario.nome,
      autorPapel: req.body.autorPapel,
      mensagem: req.body.mensagem.trim(),
    }, token);
    return res
      .location(
        `/api/comunidade/${encodeURIComponent(dados.eventoId)}/comunicados/${encodeURIComponent(dados.id)}`,
      )
      .status(201)
      .json({ sucesso: true, dados });
  } catch {
    return enviarErroServidor(res);
  }
}

export async function atualizarComunicado(
  req: RequisicaoAutenticada,
  res: Response,
) {
  const usuario = usuarioValido(req, res);
  if (!usuario) return;
  if (
    (req.body?.mensagem !== undefined &&
      (typeof req.body.mensagem !== "string" || !req.body.mensagem.trim())) ||
    (req.body?.urgente !== undefined && typeof req.body.urgente !== "boolean")
  ) {
    return res
      .status(400)
      .json({ sucesso: false, erro: "Dados inválidos para o comunicado." });
  }

  try {
    const comunicado = await buscarComunicadoServidor(req.params.id);
    if (!comunicado) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Comunicado não encontrado." });
    }
    const acesso = await verificarOrganizacao(req, res, comunicado.eventoId);
    if (!acesso) return;
    if (comunicado.autorId !== usuario.id) {
      return res.status(403).json({
        sucesso: false,
        erro: "Somente o autor pode editar o comunicado.",
      });
    }
    const token = tokenValido(req, res);
    if (!token) return;
    const alteracoes: Pick<ComunicadoOficial, "mensagem"> = {
      mensagem: req.body.mensagem?.trim() ?? comunicado.mensagem,
    };
    const dados = await atualizarComunicadoServidor(
      req.params.id,
      alteracoes,
      token,
    );
    if (!dados) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Comunicado não encontrado." });
    }
    return res.status(200).json({ sucesso: true, dados });
  } catch {
    return enviarErroServidor(res);
  }
}

export async function excluirComunicado(
  req: RequisicaoAutenticada,
  res: Response,
) {
  const usuario = usuarioValido(req, res);
  if (!usuario) return;
  try {
    const comunicado = await buscarComunicadoServidor(req.params.id);
    if (!comunicado) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Comunicado não encontrado." });
    }

    const acesso = await verificarOrganizacao(req, res, comunicado.eventoId);
    if (!acesso) return;

    const token = tokenValido(req, res);
    if (!token) return;
    const removido = await excluirComunicadoServidor(comunicado.id, token);
    if (!removido) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Comunicado não encontrado." });
    }
    return res.status(204).send();
  } catch {
    return enviarErroServidor(res);
  }
}

export async function listarDuvidas(req: Request, res: Response) {
  try {
    const dados = await listarDuvidasServidor(req.params.eventoId);
    return res.status(200).json({ sucesso: true, dados });
  } catch {
    return enviarErroServidor(res);
  }
}

export async function criarDuvida(req: RequisicaoAutenticada, res: Response) {
  const usuario = usuarioValido(req, res);
  if (!usuario) return;
  if (
    typeof req.body?.pergunta !== "string" ||
    req.body.pergunta.trim().length < 5
  ) {
    return res.status(400).json({
      sucesso: false,
      erro: "A pergunta deve ter pelo menos 5 caracteres.",
    });
  }
  try {
    const evento = await obterEvento(req.params.eventoId, res);
    if (!evento) return;
    const token = tokenValido(req, res);
    if (!token) return;
    const dados = await criarDuvidaServidor({
      eventoId: evento.id,
      autorId: usuario.id,
      autorNome: usuario.nome,
      autorEmail: usuario.email,
      pergunta: req.body.pergunta.trim(),
    }, token);
    return res
      .location(
        `/api/comunidade/${encodeURIComponent(dados.eventoId)}/duvidas/${encodeURIComponent(dados.id)}`,
      )
      .status(201)
      .json({ sucesso: true, dados });
  } catch {
    return enviarErroServidor(res);
  }
}

export async function responderDuvida(
  req: RequisicaoAutenticada,
  res: Response,
) {
  const usuario = usuarioValido(req, res);
  if (!usuario) return;
  if (typeof req.body?.resposta !== "string" || !req.body.resposta.trim()) {
    return res
      .status(400)
      .json({ sucesso: false, erro: "A resposta não pode estar vazia." });
  }
  try {
    const duvidas = await encontrarDuvida(req.params.id);
    if (!duvidas) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Dúvida não encontrada." });
    }
    const acesso = await verificarOrganizacao(req, res, duvidas.eventoId);
    if (!acesso) return;
    const token = tokenValido(req, res);
    if (!token) return;
    const dados = await atualizarDuvidaServidor(req.params.id, {
      resposta: req.body.resposta.trim(),
      respondidoPorNome: usuario.nome,
      respondidoPorId: usuario.id,
      respondidoEm: new Date().toISOString(),
    }, token);
    if (!dados) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Dúvida não encontrada." });
    }
    return res.status(200).json({ sucesso: true, dados });
  } catch {
    return enviarErroServidor(res);
  }
}

export async function atualizarDuvida(
  req: RequisicaoAutenticada,
  res: Response,
) {
  const usuario = usuarioValido(req, res);
  if (!usuario) return;
  if (
    typeof req.body?.pergunta !== "string" ||
    req.body.pergunta.trim().length < 5
  ) {
    return res.status(400).json({
      sucesso: false,
      erro: "A pergunta deve ter pelo menos 5 caracteres.",
    });
  }
  try {
    const duvida = await encontrarDuvida(req.params.id);
    if (!duvida) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Dúvida não encontrada." });
    }
    if (duvida.autorId !== usuario.id) {
      return res.status(403).json({
        sucesso: false,
        erro: "Somente o autor pode editar a dúvida.",
      });
    }
    const token = tokenValido(req, res);
    if (!token) return;
    const dados = await atualizarDuvidaServidor(req.params.id, {
      pergunta: req.body.pergunta.trim(),
    }, token);
    if (!dados) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Dúvida não encontrada." });
    }
    return res.status(200).json({ sucesso: true, dados });
  } catch {
    return enviarErroServidor(res);
  }
}

async function encontrarDuvida(id: string): Promise<DuvidaComunidade | null> {
  return buscarDuvidaServidor(id);
}

export async function excluirDuvida(req: RequisicaoAutenticada, res: Response) {
  const usuario = usuarioValido(req, res);
  if (!usuario) return;
  try {
    const duvida = await encontrarDuvida(req.params.id);
    if (!duvida) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Dúvida não encontrada." });
    }

    if (duvida.autorId !== usuario.id) {
      const acesso = await verificarOrganizacao(req, res, duvida.eventoId);
      if (!acesso) return;
    }

    const token = tokenValido(req, res);
    if (!token) return;
    const removida = await excluirDuvidaServidor(duvida.id, token);
    if (!removida) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Dúvida não encontrada." });
    }
    return res.status(204).send();
  } catch {
    return enviarErroServidor(res);
  }
}
