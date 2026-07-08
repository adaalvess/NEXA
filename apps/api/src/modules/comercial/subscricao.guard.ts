import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { tenantContext } from '../fundacao/tenant/tenant-context';
import { BLOQUEADO_POR_SUBSCRICAO_KEY } from './bloqueado-por-subscricao.decorator';
import { SubscricaoService } from './subscricao.service';
import { SubscricaoLimitadaError } from './errors';

/**
 * Aplica RN-11 (Especificação Técnica do Passo 20, 3.2) — global (`APP_GUARD`,
 * `ComercialModule`), corre em toda a aplicação, mas só bloqueia handlers
 * marcados com `@BloqueadoPorSubscricao()`. Ausência do decorator = permitir
 * (assimetria deliberada face ao `PermissaoGuard`, documentada no próprio
 * decorator).
 */
@Injectable()
export class SubscricaoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscricaoService: SubscricaoService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const bloqueavel = this.reflector.get<boolean>(BLOQUEADO_POR_SUBSCRICAO_KEY, context.getHandler());
    if (!bloqueavel) {
      return true;
    }

    const ctx = tenantContext.getStore();
    if (!ctx) {
      return false; // Fail Secure.
    }

    const estado = await this.subscricaoService.obterEstadoEfetivo(ctx.empresaId);
    if (estado === 'limitada' || estado === 'cancelada') {
      throw new SubscricaoLimitadaError();
    }

    return true;
  }
}
