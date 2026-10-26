import { Router } from "express";
import {
  listar,
  buscarPorId,
  criar,
  atualizar,
  atualizarFoto,
  adicionarCoorganizador,
  listarCoorganizadores,
  removerCoorganizador,
  excluir,
} from "../controllers/eventoController";
import {
  verificarAutenticacao,
  verificarPermissaoEdicaoEvento,
  verificarPermissaoServidor,
} from "../middlewares/autenticacao";
import { receberFotoEvento } from "../middlewares/uploadFotoEvento";

const rotas = Router();

rotas.get("/", listar);
rotas.get("/:id", buscarPorId);
rotas.post(
  "/",
  verificarAutenticacao as any,
  verificarPermissaoServidor as any,
  receberFotoEvento,
  criar,
);
rotas.patch(
  "/:id",
  verificarAutenticacao as any,
  verificarPermissaoEdicaoEvento as any,
  atualizar,
);
rotas.patch(
  "/:id/foto",
  verificarAutenticacao as any,
  verificarPermissaoEdicaoEvento as any,
  receberFotoEvento,
  atualizarFoto,
);
rotas.post(
  "/:id/coorganizadores",
  verificarAutenticacao as any,
  verificarPermissaoServidor as any,
  adicionarCoorganizador,
);
rotas.get(
  "/:id/coorganizadores",
  verificarAutenticacao as any,
  verificarPermissaoServidor as any,
  listarCoorganizadores,
);
rotas.delete(
  "/:id/coorganizadores/:coorganizadorId",
  verificarAutenticacao as any,
  verificarPermissaoServidor as any,
  removerCoorganizador,
);

rotas.delete(
  "/:id",
  verificarAutenticacao as any,
  verificarPermissaoServidor as any,
  excluir,
);

export default rotas;
