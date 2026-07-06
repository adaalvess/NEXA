import { Module } from '@nestjs/common';
import { FundacaoModule } from '../fundacao/fundacao.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * Módulo Dashboard (Blueprint EP-02, Passo 12) — terceiro módulo de
 * negócio fora da Fundação, agregação read-only, sem entidade própria
 * (Functional Specifications, 3.2). Reutiliza integralmente
 * `TenantPrismaService`/`AuthorizationService` exportados pela Fundação.
 */
@Module({
  imports: [FundacaoModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
