import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  QuotaExcedidaError,
  TimeoutIAError,
  FornecedorIndisponivelError,
  CapacidadeNaoSuportadaError,
  ErroGenericoFornecedorError,
} from './gateway/errors';

/**
 * Traduz os erros tipados do AI Gateway (Passo 15) para HTTP — primeira
 * exposição destes erros fora do processo (Especificação Técnica do Passo
 * 16, 3.6). Único ponto de tradução, nunca repetido em `try/catch` por
 * método do controlador.
 */
@Catch(QuotaExcedidaError, TimeoutIAError, FornecedorIndisponivelError, CapacidadeNaoSuportadaError, ErroGenericoFornecedorError)
export class IaExceptionFilter implements ExceptionFilter {
  catch(erro: Error, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status = this.mapearStatus(erro);
    res.status(status).json({ statusCode: status, message: erro.message });
  }

  private mapearStatus(erro: Error): number {
    if (erro instanceof QuotaExcedidaError) return HttpStatus.TOO_MANY_REQUESTS;
    if (erro instanceof TimeoutIAError) return HttpStatus.GATEWAY_TIMEOUT;
    if (erro instanceof FornecedorIndisponivelError) return HttpStatus.SERVICE_UNAVAILABLE;
    if (erro instanceof CapacidadeNaoSuportadaError) return HttpStatus.BAD_REQUEST;
    return HttpStatus.BAD_GATEWAY; // ErroGenericoFornecedorError
  }
}
