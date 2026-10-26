import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import rotasEventos from "./server/routes/rotasEventos";
import rotasComunidade from "./server/routes/rotasComunidade";
import rotasAgenda from "./server/routes/rotasAgenda";
import { tratarErros } from "./server/middlewares/tratarErros";

dotenv.config({ path: ".env.local" });
dotenv.config();

const porta = parseInt(process.env.PORT || "3000");
const origensPermitidas = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter((origem): origem is string => Boolean(origem));

function iniciarServidor() {
  const app = express();

  app.use(cors({ origin: origensPermitidas }));
  app.use(express.json());

  // Rotas de API
  app.get("/api/saude", (_req, res) => {
    res.json({
      status: "online",
      aplicacao: "ConectaIFPI — Campus Teresina Central",
      fuso: "America/Fortaleza",
      horario_servidor: new Date().toISOString(),
    });
  });

  app.use("/api/eventos", rotasEventos);
  app.use("/api/comunidade", rotasComunidade);
  app.use("/api/agenda", rotasAgenda);

  app.use(tratarErros);

  app.listen(porta, "0.0.0.0", () => {
    console.log(`[ConectaIFPI]: Servidor rodando em http://localhost:${porta}`);
  });
}

iniciarServidor();
