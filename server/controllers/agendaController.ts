import { Response } from "express";
import { RequisicaoAutenticada } from "../middlewares/autenticacao";
import { buscarEventoServidor } from "../services/eventoService";
import {
  listarFavoritosServidor,
  criarFavoritoServidor,
  excluirFavoritoServidor,
} from "../services/agendaService";

function obterUsuario(
  req: RequisicaoAutenticada,
  res: Response,
): NonNullable<RequisicaoAutenticada["usuario"]> | null {
  if (!req.usuario) {
    res.status(401).json({ sucesso: false, erro: "Autenticação necessária." });
    return null;
  }
  return req.usuario;
}

export async function listarFavoritos(
  req: RequisicaoAutenticada,
  res: Response,
) {
  const usuario = obterUsuario(req, res);
  if (!usuario) return;
  if (usuario.id !== req.params.usuarioId) {
    return res.status(403).json({
      sucesso: false,
      erro: "Você só pode consultar sua própria agenda.",
    });
  }
  const token = req.tokenAutenticacao;
  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: "A sessão do usuário é inválida ou expirou.",
    });
  }
  try {
    const dados = await listarFavoritosServidor(usuario.id, token);
    return res.status(200).json({ sucesso: true, dados });
  } catch {
    return res.status(500).json({
      sucesso: false,
      erro: "Não foi possível listar os favoritos.",
    });
  }
}

export async function criarFavorito(req: RequisicaoAutenticada, res: Response) {
  const usuario = obterUsuario(req, res);
  if (!usuario) return;
  if (typeof req.body?.eventoId !== "string" || !req.body.eventoId.trim()) {
    return res
      .status(400)
      .json({ sucesso: false, erro: "Informe um evento válido." });
  }
  const token = req.tokenAutenticacao;
  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: "A sessão do usuário é inválida ou expirou.",
    });
  }
  try {
    const evento = await buscarEventoServidor(req.body.eventoId);
    if (!evento) {
      return res
        .status(404)
        .json({ sucesso: false, erro: "Evento não encontrado." });
    }
    const dados = await criarFavoritoServidor(usuario.id, evento.id, token);
    return res
      .location(
        `/api/agenda/${encodeURIComponent(usuario.id)}/${encodeURIComponent(evento.id)}`,
      )
      .status(201)
      .json({ sucesso: true, dados });
  } catch {
    return res.status(500).json({
      sucesso: false,
      erro: "Não foi possível salvar o favorito.",
    });
  }
}

export async function excluirFavorito(
  req: RequisicaoAutenticada,
  res: Response,
) {
  const usuario = obterUsuario(req, res);
  if (!usuario) return;
  if (usuario.id !== req.params.usuarioId) {
    return res.status(403).json({
      sucesso: false,
      erro: "Você só pode alterar sua própria agenda.",
    });
  }
  const token = req.tokenAutenticacao;
  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: "A sessão do usuário é inválida ou expirou.",
    });
  }
  try {
    const removido = await excluirFavoritoServidor(
      usuario.id,
      req.params.eventoId,
      token,
    );
    if (!removido) {
      return res.status(404).json({
        sucesso: false,
        erro: "O evento não está salvo na sua agenda.",
      });
    }
    return res.status(204).send();
  } catch {
    return res.status(500).json({
      sucesso: false,
      erro: "Não foi possível remover o favorito.",
    });
  }
}
