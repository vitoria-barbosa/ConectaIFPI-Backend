import { Request, Response, NextFunction } from 'express';

export function tratarErros(
  erro: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[Erro no Servidor]:', erro);

  const status = erro.status || erro.statusCode || 500;
  const mensagem = erro.message || 'Ocorreu um erro interno no servidor.';

  res.status(status).json({
    sucesso: false,
    mensagem: mensagem
  });
}
