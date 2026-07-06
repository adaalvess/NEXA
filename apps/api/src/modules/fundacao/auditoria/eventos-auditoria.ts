/**
 * Evento único de auditoria (Especificação Técnica do Passo 6, 3.2;
 * Event & Notification Architecture Rules, 3.3 — "cada evento de negócio
 * relevante corresponde a exatamente uma entrada no Registo de Auditoria").
 *
 * Serviços de negócio emitem este evento — nunca chamam um serviço de
 * auditoria diretamente. Emitido sempre via `emitAsync` (aguardado), nunca
 * fire-and-forget: o `AuditoriaListener` é uma etapa obrigatória da operação.
 */
export const EVENTO_AUDITORIA = 'auditoria.registar';

export interface EventoAuditoria {
  /** Já validado/conhecido por quem emite — o listener confia nele, nunca o deriva de TenantContext. */
  empresaId: string;
  /** utilizadorId ou "ia". */
  ator: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  /** "A alteração efetuada" (FR-07) — ver convenção por categoria, Especificação Técnica do Passo 6, 3.3.3. */
  detalhe?: Record<string, unknown>;
}
