import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { SubscricaoLimitadaError } from './errors';

/**
 * Único ponto de tradução de RN-11 para HTTP em toda a aplicação
 * (Especificação Técnica do Passo 20, 3.3) — global (`APP_FILTER`,
 * `ComercialModule`). Resposta idêntica independentemente do módulo que a
 * originou (exigência explícita da Fundadora/CEO, aprovação do Passo 19):
 * mesmo `statusCode`, mesmo `code`, mesma `message`, nunca personalizados
 * por papel nem por módulo.
 */
@Catch(SubscricaoLimitadaError)
export class SubscricaoExceptionFilter implements ExceptionFilter {
  catch(_erro: SubscricaoLimitadaError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(402).json({
      statusCode: 402,
      code: 'SUBSCRICAO_LIMITADA',
      message: 'A tua Empresa está em acesso limitado (trial expirado ou subscrição inativa). Contacta o Administrador da Empresa para atualizar o plano.',
    });
  }
}
