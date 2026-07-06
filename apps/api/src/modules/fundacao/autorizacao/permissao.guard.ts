import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from './authorization.service';
import { PERMISSAO_METADATA_KEY, PermissaoRequerida } from './require-permissao.decorator';

/**
 * Aplica a permissão declarada por `@RequirePermissao` ao `AuthorizationService`
 * único (Especificação Técnica do Passo 5, 3.3). Corre depois do
 * `SessionGuard` (autenticação) — autorização nunca antes de autenticação
 * (Security & Access Principles, 3.2).
 */
@Injectable()
export class PermissaoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissao = this.reflector.get<PermissaoRequerida>(PERMISSAO_METADATA_KEY, context.getHandler());

    if (!permissao) {
      // Nenhuma permissão declarada — Fail Secure: nega, nunca assume.
      throw new ForbiddenException();
    }

    const permitido = await this.authorizationService.podeExecutar(permissao.modulo, permissao.acao);
    if (!permitido) {
      throw new ForbiddenException();
    }

    return true;
  }
}
