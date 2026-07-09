import { HttpException } from '@nestjs/common';

/**
 * RN-10 (Especificação Técnica do Passo 33) — bloqueia especificamente a
 * criação de um novo Utilizador além do limite `limiteUtilizadores` do
 * plano ativo, nunca um bloqueio geral da plataforma.
 *
 * Definida aqui, dentro de `fundacao/convite/`, e nunca em `comercial`
 * (Decisão A do Passo 33) — `FundacaoModule` nunca importa `ComercialModule`,
 * mesma regra estrutural já aplicada em todo o projeto; `code` distinto de
 * `SUBSCRICAO_LIMITADA` (RN-11), causas diferentes, nunca confundidas.
 */
export class LimiteUtilizadoresAtingidoError extends HttpException {
  constructor(limite: number) {
    super(
      {
        statusCode: 402,
        code: 'LIMITE_UTILIZADORES_ATINGIDO',
        message: `A Empresa atingiu o limite de ${limite} utilizadores do plano atual. Contacta o Administrador para atualizar o plano.`,
      },
      402,
    );
  }
}
