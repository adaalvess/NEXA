import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailAdapterInterface } from './email-adapter.interface';
import { EmailMensagem, EmailResultado } from '../email-gateway.types';

/**
 * Único adaptador real (Especificação Técnica do Passo 29, Decisão D1) —
 * traduz o contrato neutro do Gateway para o SDK oficial do Resend e de
 * volta; nenhum tipo do SDK é reexportado fora deste ficheiro (mesmo
 * princípio do `AnthropicAdapter`, ADR-005 §3.6).
 */
@Injectable()
export class ResendAdapter implements EmailAdapterInterface {
  readonly nome = 'resend';

  private readonly client: Resend;

  constructor() {
    this.client = new Resend(process.env.RESEND_API_KEY || 're_placeholder_sem_credencial_real');
  }

  async enviar(mensagem: EmailMensagem): Promise<EmailResultado> {
    const resposta = await this.client.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'NEXA <onboarding@resend.dev>',
      to: mensagem.destinatario,
      subject: mensagem.assunto,
      html: mensagem.corpoHtml,
    });

    return { enviado: !resposta.error, idFornecedor: resposta.data?.id };
  }
}
