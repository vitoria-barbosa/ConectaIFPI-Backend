import { Request, Response, NextFunction } from "express";
import {
  criarClienteSupabaseAutenticado,
  supabase,
} from "../config/supabaseClient";
import { buscarEventoServidor } from "../services/eventoService";

export type TipoUsuario = "servidor" | "aluno" | "externo";

export interface RequisicaoAutenticada extends Request {
  eventoCoorganizador?: boolean;
  tokenAutenticacao?: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: TipoUsuario;
  };
}

export async function verificarPermissaoEdicaoEvento(
  req: RequisicaoAutenticada,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.usuario?.tipo === "servidor") {
    next();
    return;
  }

  if (req.usuario?.tipo !== "aluno") {
    res.status(403).json({
      sucesso: false,
      erro: "Permissão negada. Apenas organizadores e coorganizadores podem editar eventos.",
    });
    return;
  }

  try {
    const evento = await buscarEventoServidor(req.params.id);
    if (!evento) {
      res.status(404).json({ sucesso: false, erro: "Evento não encontrado." });
      return;
    }

    if (!evento.coorganizadoresIds.includes(req.usuario.id)) {
      res.status(403).json({
        sucesso: false,
        erro: "Permissão negada. Você não é coorganizador deste evento.",
      });
      return;
    }

    req.eventoCoorganizador = true;
    next();
  } catch (erro) {
    console.error("[Evento] Falha ao verificar permissão de edição:", erro);
    res.status(500).json({
      sucesso: false,
      erro: "Não foi possível validar a permissão para editar o evento.",
    });
  }
}

function extrairToken(req: Request): string {
  const autorizacao = req.headers.authorization;
  if (typeof autorizacao !== "string") return "";

  const [esquema, token] = autorizacao.split(" ");
  return esquema?.toLowerCase() === "bearer" && token ? token : "";
}

export async function verificarAutenticacao(
  req: RequisicaoAutenticada,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extrairToken(req);

  if (!token) {
    res.status(401).json({
      sucesso: false,
      erro: "Acesso não autorizado. Autenticação necessária.",
    });
    return;
  }

  try {
    // 1. O Supabase valida assinatura e expiração do token
    const { data, error } = await supabase.auth.getUser(token);
    const usuarioAuth = data.user;

    if (error || !usuarioAuth || !usuarioAuth.email) {
      res.status(401).json({
        sucesso: false,
        erro: "A sessão do usuário é inválida ou expirou.",
      });
      return;
    }

    // 2. Defesa extra: exige e-mail confirmado
    if (!usuarioAuth.email_confirmed_at) {
      res.status(403).json({
        sucesso: false,
        erro: "Confirme seu e-mail para acessar este recurso.",
      });
      return;
    }

    // 3. Nome e tipo vêm da tabela "usuario" (fonte da verdade)
    const clienteAutenticado = criarClienteSupabaseAutenticado(token);
    const { data: perfil, error: erroPerfil } = await clienteAutenticado
      .from("usuarios")
      .select("nome, tipo")
      .eq("id", usuarioAuth.id)
      .maybeSingle();

    if (erroPerfil) {
      console.error("[Auth] Erro ao buscar perfil:", erroPerfil.message);
      res.status(503).json({
        sucesso: false,
        erro: "Não foi possível validar o perfil do usuário.",
      });
      return;
    }

    if (!perfil) {
      res.status(403).json({
        sucesso: false,
        erro: "Perfil de usuário não encontrado.",
      });
      return;
    }

    req.usuario = {
      id: usuarioAuth.id,
      nome: perfil.nome,
      email: usuarioAuth.email.toLowerCase(),
      tipo: perfil.tipo as TipoUsuario,
    };
    req.tokenAutenticacao = token;
    next();
  } catch (err) {
    console.error("[Auth] Falha ao validar sessão:", err);
    res.status(503).json({
      sucesso: false,
      erro: "Não foi possível validar a sessão do usuário.",
    });
  }
}

export function verificarPermissaoServidor(
  req: RequisicaoAutenticada,
  res: Response,
  next: NextFunction,
): void {
  if (req.usuario?.tipo !== "servidor") {
    res.status(403).json({
      sucesso: false,
      erro: "Permissão negada. Apenas servidores do IFPI podem cadastrar novos eventos.",
    });
    return;
  }
  next();
}
