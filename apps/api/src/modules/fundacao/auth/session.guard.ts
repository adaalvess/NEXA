import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_COOKIE_NAME } from './auth.constants';

export interface UtilizadorAutenticado {
  utilizadorId: string;
  empresaId: string;
  papel: string;
}

/**
 * Resolução de sessão (autenticação) — Passo 3.
 *
 * Nota de arquitetura (Especificação Técnica do Passo 3, 3.1.3 e Security &
 * Access Principles 3.2): este guard responde apenas a "o pedido está
 * autenticado?", nunca a "o que pode fazer?". Não verifica papel RBAC, não
 * aplica escopo de tenant a queries de negócio, não consulta Partilha — essas
 * responsabilidades pertencem ao serviço único de autorização do Passo 4 e ao
 * RBAC granular do Passo 5, que substituem/estendem este guard.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { utilizador?: UtilizadorAutenticado }>();
    const sessaoId: string | undefined = request.cookies?.[SESSION_COOKIE_NAME];

    if (!sessaoId) {
      throw new UnauthorizedException();
    }

    const sessao = await this.prisma.sessao.findUnique({ where: { id: sessaoId } });

    // Fail Secure (Security & Access Principles, 3.9): qualquer estado
    // inesperado (sessão inexistente, expirada, utilizador desativado)
    // resulta em negação, nunca em acesso concedido por defeito.
    if (!sessao || sessao.expiraEm.getTime() < Date.now()) {
      throw new UnauthorizedException();
    }

    const utilizador = await this.prisma.utilizador.findFirst({
      where: { id: sessao.utilizadorId, empresaId: sessao.empresaId },
    });

    if (!utilizador || utilizador.eliminadoEm) {
      throw new UnauthorizedException();
    }

    request.utilizador = {
      utilizadorId: utilizador.id,
      empresaId: utilizador.empresaId,
      papel: utilizador.papel,
    };

    return true;
  }
}
