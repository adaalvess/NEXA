import { Module } from '@nestjs/common';
import { FundacaoModule } from '../fundacao/fundacao.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

/**
 * Módulo CRM (Blueprint EP-04, Passo 10) — segundo módulo de negócio fora
 * da Fundação, reutilizando integralmente `TenantPrismaService`/
 * `AuthorizationService`/`PermissaoGuard`/`SessionGuard` exportados desde
 * o Passo 9 — nenhuma lógica de visibilidade duplicada.
 */
@Module({
  imports: [FundacaoModule],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
