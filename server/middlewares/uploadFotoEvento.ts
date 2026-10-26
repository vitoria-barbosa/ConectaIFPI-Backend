import multer from "multer";
import { NextFunction, Request, Response } from "express";

const TIPOS_IMAGEM_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];

const carregarFoto = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, arquivo, callback) => {
    if (!TIPOS_IMAGEM_PERMITIDOS.includes(arquivo.mimetype)) {
      callback(new Error("A foto deve estar no formato JPG, PNG ou WebP."));
      return;
    }
    callback(null, true);
  },
}).single("fotoCapa");

export function receberFotoEvento(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  carregarFoto(req, res, (erro: unknown) => {
    if (!erro) {
      next();
      return;
    }

    if (erro instanceof multer.MulterError) {
      const status = erro.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      res.status(status).json({
        sucesso: false,
        erro:
          status === 413
            ? "A foto deve ter no máximo 5 MB."
            : "O envio da foto de capa é inválido.",
      });
      return;
    }

    if (erro instanceof Error && erro.message.includes("formato JPG")) {
      res.status(415).json({ sucesso: false, erro: erro.message });
      return;
    }

    next(erro);
  });
}
