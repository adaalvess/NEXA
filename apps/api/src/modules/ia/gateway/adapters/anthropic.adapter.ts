import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AIAdapterInterface } from './ai-adapter.interface';
import { AIRequest, AIResponse } from '../ai-gateway.types';

/**
 * Único adaptador real do Passo 15 (Decisão Já Validada A, Proposta do M3)
 * — traduz o contrato neutro do Gateway para o SDK oficial da Anthropic e
 * de volta; nenhum tipo do SDK é reexportado fora deste ficheiro (ADR-005 §3.6).
 */
@Injectable()
export class AnthropicAdapter implements AIAdapterInterface {
  readonly nome = 'anthropic';
  readonly capacidadesSuportadas: string[] = ['texto'];

  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async enviar(pedido: AIRequest): Promise<AIResponse> {
    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: pedido.sistema,
      messages: pedido.mensagens.map((m) => ({
        role: m.papel === 'utilizador' ? 'user' : 'assistant',
        content: m.conteudo,
      })),
    });

    const bloco = resposta.content.find((b) => b.type === 'text');

    return {
      conteudo: bloco && bloco.type === 'text' ? bloco.text : '',
      fornecedorUsado: this.nome,
      capacidadesUsadas: ['texto'],
    };
  }
}
