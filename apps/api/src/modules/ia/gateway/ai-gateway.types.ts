/**
 * Contrato neutro de tipos do AI Gateway (ADR-005 §3.6) — nunca um alias
 * nem uma reexportação de um tipo de SDK de fornecedor. Cada adaptador
 * traduz entre o seu SDK e estes tipos, nos dois sentidos (Especificação
 * Técnica do Passo 15, 3.2).
 */
export interface AIRequest {
  sistema: string;
  mensagens: { papel: 'utilizador' | 'assistente'; conteudo: string }[];
  /** Negociação de capacidades (ADR-005 §3.5) — ex: ['tool_use']. */
  capacidadesRequeridas?: string[];
}

export interface AIResponse {
  conteudo: string;
  fornecedorUsado: string;
  capacidadesUsadas: string[];
}

/**
 * Distinção estrutural sugestão/execução (ADR-005 §3.7) — os dois tipos são
 * incompatíveis ao nível do sistema de tipos; só `confirmar()` transforma
 * um `PendingSuggestion` num `ConfirmedAction`, correspondendo à confirmação
 * humana exigida por RN-08. Consumido a partir do Passo 17 (UC-06); o
 * contrato nasce aqui, junto do resto do Gateway (Especificação Técnica do
 * Passo 15, 3.2).
 */
export interface PendingSuggestion {
  readonly _tag: 'PendingSuggestion';
  sugestaoId: string;
}

export interface ConfirmedAction {
  readonly _tag: 'ConfirmedAction';
  sugestaoId: string;
  confirmadoPor: string;
}

export function confirmar(pendente: PendingSuggestion, utilizadorId: string): ConfirmedAction {
  return { _tag: 'ConfirmedAction', sugestaoId: pendente.sugestaoId, confirmadoPor: utilizadorId };
}
