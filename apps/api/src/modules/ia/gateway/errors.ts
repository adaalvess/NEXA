/**
 * Classificação de erros do AI Gateway (Especificação Técnica do Passo 15,
 * 3.7) — cada tipo mapeia para uma resposta HTTP explícita no controlador
 * que o consumir (Passo 16/17); nunca um erro genérico não classificado.
 */
export class QuotaExcedidaError extends Error {
  constructor() {
    super('Limite mensal de utilização da IA excedido para esta Empresa.');
  }
}

export class CapacidadeNaoSuportadaError extends Error {
  constructor(capacidade: string, fornecedor: string) {
    super(`O fornecedor "${fornecedor}" não suporta a capacidade "${capacidade}" pedida.`);
  }
}

export class FornecedorIndisponivelError extends Error {
  constructor(fornecedor: string) {
    super(`O fornecedor "${fornecedor}" está temporariamente indisponível (circuit breaker aberto).`);
  }
}

export class TimeoutIAError extends Error {
  constructor(fornecedor: string) {
    super(`O fornecedor "${fornecedor}" não respondeu dentro do tempo limite.`);
  }
}

export class ErroGenericoFornecedorError extends Error {
  constructor(fornecedor: string, causaOriginal: unknown) {
    super(`O fornecedor "${fornecedor}" devolveu um erro inesperado.`);
    this.cause = causaOriginal;
  }
}
