/**
 * Versões dos documentos legais (Especificação Técnica do Passo 47, Decisão
 * C) — fonte de verdade do que fica gravado em `ConsentimentoRegisto` no
 * registo público. As páginas `/termos`/`/privacidade` no frontend mostram o
 * mesmo número de versão como texto simples, mantido em sincronia
 * manualmente (documentos legais mudam raramente; sem justificação para um
 * endpoint dedicado só para isto).
 *
 * Se o conteúdo de qualquer um dos documentos mudar de forma substantiva,
 * a versão correspondente tem de ser incrementada aqui — nunca reescrever
 * o conteúdo silenciosamente mantendo a mesma versão, já que
 * `ConsentimentoRegisto` é a prova de que um Utilizador aceitou uma versão
 * específica num dado momento (Decisão B, imutabilidade).
 */
export const VERSAO_TERMOS = '1.0';
export const VERSAO_PRIVACIDADE = '1.0';
