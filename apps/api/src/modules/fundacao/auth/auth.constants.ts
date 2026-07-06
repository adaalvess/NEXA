/** Nome do cookie de sessão (ADR-004, 3.2). */
export const SESSION_COOKIE_NAME = 'nexa_session';

/** Duração da sessão — renovação deslizante, 7 dias (ADR-007, 3.5).
 * Nota (Especificação Técnica do Passo 3, 3.2.3): a renovação por atividade
 * fica para o Passo 4 — aqui a sessão expira sempre 7 dias após o login. */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hash de referência fixo, usado para mitigar ataques de temporização
 * quando o email de login não corresponde a nenhum Utilizador (Especificação
 * Técnica do Passo 3, 3.1.2/S3) — garante que `argon2.verify` executa
 * trabalho computacional equivalente em ambos os ramos (utilizador existente
 * vs. inexistente), não é uma credencial real.
 */
export const DECOY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=4$C2mBn/awTbV6J5C3ytlLmQ$HIx5RujQibTiPxxaW70ViLKVPNCMez+529izDZuSTUU';
