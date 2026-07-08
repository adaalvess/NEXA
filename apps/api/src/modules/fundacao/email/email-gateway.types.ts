/**
 * Contrato neutro de mensagem de email (Especificação Técnica do Passo 29,
 * 3.1) — mesmo princípio já aplicado ao `AIRequest`/`AIResponse` (Passo 15,
 * ADR-005 §3.6): nenhum tipo do SDK de um fornecedor concreto atravessa
 * esta fronteira, só os adaptadores em `adapters/` conhecem o SDK real.
 */
export interface EmailMensagem {
  destinatario: string;
  assunto: string;
  corpoHtml: string;
}

export interface EmailResultado {
  enviado: boolean;
  idFornecedor?: string;
}
