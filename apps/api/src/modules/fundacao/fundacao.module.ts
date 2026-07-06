import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { TenantPrismaService } from './prisma/tenant-prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { SessionGuard } from './auth/session.guard';
import { TenantContextMiddleware } from './tenant/tenant-context.middleware';

/**
 * Módulo Fundação (Blueprint EP-01) — Passos 3 (Autenticação) e 4 (Camada 1)
 * implementados. RBAC granular (Passo 5), Registo de Auditoria (Passo 6) e
 * Partilha (Passo 7) juntam-se a este módulo nos passos correspondentes.
 *
 * `PrismaService` (bruto) fica privado a este módulo — não é exportado.
 * `TenantPrismaService` é o único ponto de acesso a dados de negócio a
 * exportar para módulos futuros (Processos, CRM, Dashboard, IA, Comercial).
 */
@Module({
  controllers: [AuthController],
  providers: [PrismaService, TenantPrismaService, AuthService, SessionGuard, TenantContextMiddleware],
  exports: [TenantPrismaService],
})
export class FundacaoModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
