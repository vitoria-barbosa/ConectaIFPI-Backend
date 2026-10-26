import { Router } from "express";
import {
  atualizarComunicado,
  atualizarDuvida,
  criarComunicado,
  criarDuvida,
  excluirComunicado,
  excluirDuvida,
  listarComunicados,
  listarDuvidas,
  responderDuvida,
} from "../controllers/comunidadeController";
import { verificarAutenticacao } from "../middlewares/autenticacao";

const rotas = Router();
const autenticar = verificarAutenticacao as any;

rotas.get("/:eventoId/comunicados", listarComunicados);
rotas.post("/:eventoId/comunicados", autenticar, criarComunicado);
rotas.patch("/comunicados/:id", autenticar, atualizarComunicado);
rotas.delete("/comunicados/:id", autenticar, excluirComunicado);

rotas.get("/:eventoId/duvidas", listarDuvidas);
rotas.post("/:eventoId/duvidas", autenticar, criarDuvida);
rotas.patch("/duvidas/:id", autenticar, atualizarDuvida);
rotas.patch("/duvidas/:id/resposta", autenticar, responderDuvida);
rotas.delete("/duvidas/:id", autenticar, excluirDuvida);

export default rotas;
