import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TenantContextValue } from '../tenant/tenant-context';

/**
 * Exigência de autenticação por rota (`@UseGuards(SessionGuard)`).
 *
 * Nota de arquitetura (Especificação Técnica do Passo 4, correção técnica
 * aprovada): este guard **não resolve sessão** — isso é responsabilidade
 * única do `TenantContextMiddleware`, aplicado a todas as rotas antes deste
 * guard correr. Este guard só verifica se essa resolução já aconteceu
 * (`request.utilizador` populado); nenhuma lógica de sessão é duplicada
 * aqui. Continua a ser apenas autenticação ("quem é"), nunca autorização
 * RBAC/tenant (Security & Access Principles, 3.2) — essa distinção,
 * estabelecida no Passo 3, mantém-se inalterada.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { utilizador?: TenantContextValue }>();

    if (!request.utilizador) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
