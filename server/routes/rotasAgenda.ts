import { Router } from "express";
import {
  criarFavorito,
  excluirFavorito,
  listarFavoritos,
} from "../controllers/agendaController";
import { verificarAutenticacao } from "../middlewares/autenticacao";

const rotas = Router();
const autenticar = verificarAutenticacao as any;

rotas.get("/:usuarioId", autenticar, listarFavoritos);
rotas.post("/", autenticar, criarFavorito);
rotas.delete("/:usuarioId/:eventoId", autenticar, excluirFavorito);

export default rotas;
