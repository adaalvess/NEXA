import { AIAdapterInterface } from './ai-adapter.interface';
import { AIRequest, AIResponse } from '../ai-gateway.types';

export type ComportamentoFakeAdapter = 'sucesso' | 'timeout' | 'erro_generico';

/**
 * Adaptador simulado (Especificação Técnica do Passo 15, 3.9 — condição
 * explícita da aprovação do M3) — nunca faz uma chamada de rede real, nunca
 * é importado por `ia.module.ts` em execução normal, só por testes via
 * `overrideProvider`. Determinístico e configurável por teste.
 */
export class FakeAdapter implements AIAdapterInterface {
  readonly nome = 'fake';
  capacidadesSuportadas: string[] = ['texto'];
  comportamento: ComportamentoFakeAdapter = 'sucesso';
  respostaConfigurada = 'Resposta simulada.';
  chamadas = 0;

  async enviar(_pedido: AIRequest): Promise<AIResponse> {
    this.chamadas += 1;

    if (this.comportamento === 'timeout') {
      // Nunca resolve dentro do timeout configurado no Gateway — o próprio
      // Gateway é responsável por abortar (3.6), este adaptador só simula
      // uma chamada lenta o suficiente para isso ser testável.
      await new Promise((resolve) => setTimeout(resolve, 60_000));
    }

    if (this.comportamento === 'erro_generico') {
      throw new Error('Erro simulado do fornecedor.');
    }

    return { conteudo: this.respostaConfigurada, fornecedorUsado: this.nome, capacidadesUsadas: ['texto'] };
  }
}
