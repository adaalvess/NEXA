import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService } from './prisma/prisma.service';
import { TenantPrismaService } from './prisma/tenant-prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { SessionGuard } from './auth/session.guard';
import { UtilizadoresController } from './auth/utilizadores.controller';
import { UtilizadoresService } from './auth/utilizadores.service';
import { AuthorizationService } from './autorizacao/authorization.service';
import { PermissaoGuard } from './autorizacao/permissao.guard';
import { TenantContextMiddleware } from './tenant/tenant-context.middleware';
import { AuditoriaController } from './auditoria/auditoria.controller';
import { AuditoriaService } from './auditoria/auditoria.service';
import { AuditoriaInternaService } from './auditoria/auditoria-interna.service';
import { AuditoriaListener } from './auditoria/auditoria.listener';

/**
 * Módulo Fundação (Blueprint EP-01) — Passos 3 (Autenticação), 4 (Camada 1),
 * 5 (RBAC granular) e 6 (Registo de Auditoria) implementados. Partilha
 * (Passo 7) junta-se a este módulo no passo correspondente.
 *
 * `EventEmitterModule.forRoot()` regista-se aqui, não em `AppModule` — a
 * Fundação é o dono natural do mecanismo de eventos que sustenta a auditoria
 * (Event & Notification Architecture Rules, 3.3); é um módulo global do
 * NestJS, disponível para qualquer módulo futuro (Processos, CRM, ...) que
 * precise de emitir eventos, sem os importar explicitamente.
 *
 * `PrismaService` (bruto) fica privado a este módulo — não é exportado.
 * `TenantPrismaService` é o único ponto de acesso a dados de negócio a
 * exportar para módulos futuros (Processos, CRM, Dashboard, IA, Comercial).
 */
@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [AuthController, UtilizadoresController, AuditoriaController],
  providers: [
    PrismaService,
    TenantPrismaService,
    AuthService,
    SessionGuard,
    TenantContextMiddleware,
    UtilizadoresService,
    AuthorizationService,
    PermissaoGuard,
    AuditoriaService,
    AuditoriaInternaService,
    AuditoriaListener,
  ],
  exports: [TenantPrismaService],
})
export class FundacaoModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
