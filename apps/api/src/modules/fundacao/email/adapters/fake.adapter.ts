import { EmailAdapterInterface } from './email-adapter.interface';
import { EmailMensagem, EmailResultado } from '../email-gateway.types';

/**
 * Adaptador simulado (Especificação Técnica do Passo 29, 3.1) — nunca faz
 * uma chamada de rede real, nunca é importado por `fundacao.module.ts` em
 * execução normal, só por testes via `overrideProvider` (mesmo padrão do
 * `FakeAdapter` de IA, Passo 15). Regista a última mensagem enviada,
 * permitindo a um teste futuro (Passo 30) inspecionar o link/token
 * incluído no corpo do email.
 */
export class FakeEmailAdapter implements EmailAdapterInterface {
  readonly nome = 'fake';
  chamadas = 0;
  ultimaMensagem: EmailMensagem | undefined;
  deveFalhar = false;

  async enviar(mensagem: EmailMensagem): Promise<EmailResultado> {
    this.chamadas += 1;
    this.ultimaMensagem = mensagem;

    if (this.deveFalhar) {
      return { enviado: false };
    }

    return { enviado: true, idFornecedor: 'fake-id' };
  }
}
