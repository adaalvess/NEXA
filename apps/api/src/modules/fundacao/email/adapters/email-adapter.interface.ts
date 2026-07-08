import { EmailMensagem, EmailResultado } from '../email-gateway.types';

/**
 * Contrato comum a todo adaptador de fornecedor de email (Regra não-
 * negociável #5, Substituibilidade Controlada; Especificação Técnica do
 * Passo 29, 3.1 — mesmo desenho do `AIAdapterInterface`, Passo 15). Nenhum
 * módulo chama o SDK de um fornecedor de email diretamente — só através
 * desta interface.
 */
export interface EmailAdapterInterface {
  readonly nome: string;
  enviar(mensagem: EmailMensagem): Promise<EmailResultado>;
}

/** Token de injeção — o adaptador concreto é registado no `FundacaoModule`. */
export const EMAIL_ADAPTER = 'EMAIL_ADAPTER';
