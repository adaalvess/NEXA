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
import { NotificacaoListener } from './notificacao/notificacao.listener';
import { EMAIL_ADAPTER } from './email/adapters/email-adapter.interface';
import { ResendAdapter } from './email/adapters/resend.adapter';
import { ConviteController } from './convite/convite.controller';
import { ConviteService } from './convite/convite.service';

/**
 * Módulo Fundação (Blueprint EP-01) — Passos 3 (Autenticação), 4 (Camada 1),
 * 5 (RBAC granular), 6 (Registo de Auditoria), 7 (Partilha), 8
 * (Departamento) e 11 (Notification Dispatcher) implementados.
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
 *
 * `EMAIL_ADAPTER` (Passo 29) — interface própria de envio de email
 * (Regra não-negociável #5, Substituibilidade Controlada), mesmo desenho
 * do `AI_ADAPTER` (Passo 15); `ResendAdapter` é o único adaptador real
 * registado aqui. Sem `EmailGatewayService` intermédio (Especificação
 * Técnica do Passo 29, 3.2/Decisão D2) — `ConviteService` (Passo 30) injeta
 * `EMAIL_ADAPTER` diretamente, primeiro consumidor real.
 */
@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [
    AuthController,
    UtilizadoresController,
    AuditoriaController,
    PartilhaController,
    DepartamentoController,
    ConviteController,
  ],
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
    NotificacaoListener,
    { provide: EMAIL_ADAPTER, useClass: ResendAdapter },
    ConviteService,
  ],
  exports: [TenantPrismaService, AuthorizationService, PermissaoGuard, SessionGuard, EMAIL_ADAPTER],
})
export class FundacaoModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
