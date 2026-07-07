import { AIRequest, AIResponse } from '../ai-gateway.types';

/**
 * Contrato comum a todo adaptador de fornecedor (ADR-005 §3.2, Opção B;
 * §3.5 — negociação de capacidades). O `AiGatewayService` depende só desta
 * interface, nunca de um SDK concreto (Especificação Técnica do Passo 15, 3.3).
 */
export interface AIAdapterInterface {
  readonly nome: string;
  readonly capacidadesSuportadas: string[];
  enviar(pedido: AIRequest): Promise<AIResponse>;
}

/** Token de injeção — o adaptador concreto é registado no `IaModule` (3.4). */
export const AI_ADAPTER = 'AI_ADAPTER';
