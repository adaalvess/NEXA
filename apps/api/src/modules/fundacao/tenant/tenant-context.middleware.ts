import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_COOKIE_NAME, SESSION_DURATION_MS, SESSION_RENEWAL_THRESHOLD_MS } from '../auth/auth.constants';
import { tenantContext, TenantContextValue } from './tenant-context';

/**
 * Único ponto de resolução de sessão para o TenantContext (Especificação
 * Técnica do Passo 4, 3.2.2/correção técnica aprovada). Middleware, não
 * Guard — só um Middleware consegue envolver a continuação do pedido
 * (Interceptors → Controller → Handler) dentro de `tenantContext.run(...)`,
 * o que é necessário para o AsyncLocalStorage propagar corretamente.
 *
 * Aplicado a todas as rotas (`forRoutes('*')`, ver FundacaoModule). Pedidos
 * sem cookie de sessão válido simplesmente não populam o contexto — não
 * lançam erro aqui, porque nem toda rota exige autenticação (ex: login,
 * registo). A exigência de autenticação é responsabilidade do `SessionGuard`,
 * aplicado por rota, que só consulta o resultado desta resolução.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request & { utilizador?: TenantContextValue }, res: Response, next: NextFunction): Promise<void> {
    const sessaoId: string | undefined = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessaoId) {
      next();
      return;
    }

    const sessao = await this.prisma.sessao.findUnique({ where: { id: sessaoId } });
    if (!sessao || sessao.expiraEm.getTime() < Date.now()) {
      next();
      return;
    }

    // Renovação deslizante (ADR-007, 3.5; pendente desde o Passo 4, resolvida
    // na Especificação Técnica do Passo 5, 3.6) — só escreve à BD quando já
    // passou mais de 1 dia desde a última renovação (expiraEm a menos de 6
    // dias), evitando uma escrita em todos os pedidos.
    if (sessao.expiraEm.getTime() - Date.now() < SESSION_RENEWAL_THRESHOLD_MS) {
      await this.prisma.sessao.update({
        where: { id: sessao.id },
        data: { expiraEm: new Date(Date.now() + SESSION_DURATION_MS) },
      });
    }

    const utilizador = await this.prisma.utilizador.findFirst({
      where: { id: sessao.utilizadorId, empresaId: sessao.empresaId },
    });
    if (!utilizador || utilizador.eliminadoEm) {
      next();
      return;
    }

    const valor: TenantContextValue = {
      utilizadorId: utilizador.id,
      empresaId: utilizador.empresaId,
      papel: utilizador.papel,
    };

    req.utilizador = valor;
    tenantContext.run(valor, () => next());
  }
}
