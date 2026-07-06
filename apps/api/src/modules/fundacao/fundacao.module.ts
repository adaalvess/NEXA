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
import { PartilhaController } from './partilha/partilha.controller';
import { PartilhaService } from './partilha/partilha.service';
import { DepartamentoController } from './departamento/departamento.controller';
import { DepartamentoService } from './departamento/departamento.service';

/**
 * Módulo Fundação (Blueprint EP-01) — Passos 3 (Autenticação), 4 (Camada 1),
 * 5 (RBAC granular), 6 (Registo de Auditoria), 7 (Partilha) e 8
 * (Departamento) implementados.
 *
 * `EventEmitterModule.forRoot()` regista-se aqui, não em `AppModule` — a
 * Fundação é o dono natural do mecanismo de eventos que sustenta a auditoria
 * (Event & Notification Architecture Rules, 3.3); é um módulo global do
 * NestJS, disponível para qualquer módulo futuro (Processos, CRM, ...) que
 * precise de emitir eventos, sem os importar explicitamente.
 *
 * `PrismaService` (bruto) fica privado a este módulo — não é exportado.
 * `TenantPrismaService`, `AuthorizationService`, `PermissaoGuard` e
 * `SessionGuard` são o ponto de acesso a dados de negócio e a autorização
 * exportado para módulos de negócio (Especificação Técnica do Passo 9, 3.4
 * — necessário a partir do primeiro módulo fora da Fundação: Processos).
 */
@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [AuthController, UtilizadoresController, AuditoriaController, PartilhaController, DepartamentoController],
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
    PartilhaService,
    DepartamentoService,
  ],
  exports: [TenantPrismaService, AuthorizationService, PermissaoGuard, SessionGuard],
})
export class FundacaoModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
