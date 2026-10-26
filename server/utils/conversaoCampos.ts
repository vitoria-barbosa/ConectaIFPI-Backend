function converterChaves(valor: unknown, converterNome: (nome: string) => string): unknown {
  if (Array.isArray(valor)) {
    return valor.map((item) => converterChaves(item, converterNome));
  }

  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, item]) => [
        converterNome(chave),
        converterChaves(item, converterNome)
      ])
    );
  }

  return valor;
}

export function converterParaCamelCase<T>(valor: unknown): T {
  return converterChaves(valor, (nome) =>
    nome.replace(/_([a-z0-9])/g, (_correspondencia, letra: string) => letra.toUpperCase())
  ) as T;
}

export function converterParaSnakeCase<T>(valor: unknown): T {
  return converterChaves(valor, (nome) =>
    nome.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`)
  ) as T;
}
