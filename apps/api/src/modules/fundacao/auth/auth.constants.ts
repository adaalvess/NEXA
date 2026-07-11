/** Nome do cookie de sessão (ADR-004, 3.2). */
export const SESSION_COOKIE_NAME = 'nexa_session';

/** Duração da sessão — renovação deslizante, 7 dias (ADR-007, 3.5). */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Limiar de renovação deslizante (Especificação Técnica do Passo 5, 3.6):
 * só renova quando faltam menos de 6 dias para `expiraEm` (i.e., já passou
 * mais de 1 dia desde a última renovação) — evita escrever à BD em todos os
 * pedidos.
 */
export const SESSION_RENEWAL_THRESHOLD_MS = 6 * 24 * 60 * 60 * 1000;

/**
 * Hash de referência fixo, usado para mitigar ataques de temporização
 * quando o email de login não corresponde a nenhum Utilizador (Especificação
 * Técnica do Passo 3, 3.1.2/S3) — garante que `argon2.verify` executa
 * trabalho computacional equivalente em ambos os ramos (utilizador existente
 * vs. inexistente), não é uma credencial real.
 */
export const DECOY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=4$C2mBn/awTbV6J5C3ytlLmQ$HIx5RujQibTiPxxaW70ViLKVPNCMez+529izDZuSTUU';

/**
 * Rate limiting de login por combinação IP+conta (ADR-007 §3.6;
 * Especificação Técnica do Passo 39) — bloqueio progressivo em 3 camadas.
 * Cada camada usa a sua própria duração como janela de contagem — um
 * bloqueio "dura" exatamente enquanto o número de tentativas falhadas
 * dentro dessa janela continuar a satisfazer o limiar (o bloqueio decai
 * naturalmente à medida que tentativas antigas saem da janela, sem precisar
 * de guardar um timestamp explícito de "fim do bloqueio"). Calibração
 * inicial, explicitamente ajustável (ADR-007, Questão em Aberto Q3 —
 * "parâmetros exatos... observação pós-lançamento").
 */
export const LOGIN_LOCKOUT_TIERS: { minTentativas: number; janelaMs: number }[] = [
  { minTentativas: 15, janelaMs: 60 * 60 * 1000 },
  { minTentativas: 10, janelaMs: 30 * 60 * 1000 },
  { minTentativas: 5, janelaMs: 15 * 60 * 1000 },
];

/** Idade máxima de uma tentativa falhada antes de ser elegível para limpeza oportunista. */
export const LOGIN_ATTEMPT_CLEANUP_AGE_MS = 24 * 60 * 60 * 1000;
