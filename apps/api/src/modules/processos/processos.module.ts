import { Module } from '@nestjs/common';
import { FundacaoModule } from '../fundacao/fundacao.module';
import { ProcessosController } from './processos.controller';
import { ProcessosService } from './processos.service';

/**
 * Módulo Processos (Blueprint EP-03, Passo 9) — primeiro módulo de negócio
 * fora da Fundação (System Design Principles, regra #1). Importa
 * `FundacaoModule` para `TenantPrismaService`, `AuthorizationService`,
 * `PermissaoGuard` e `SessionGuard` (exportados desde o Passo 9, 3.4) —
 * nenhum acesso direto aos dados internos de outro módulo.
 *
 * `ProcessosService` exportado desde o Passo 17 (Especificação Técnica do
 * Passo 17, 3.8/Decisão C) — primeira vez que um módulo de negócio consome
 * o serviço de outro módulo de negócio (`IaModule`, para executar uma
 * reatribuição confirmada sem duplicar PR-01 a PR-07).
 */
@Module({
  imports: [FundacaoModule],
  controllers: [ProcessosController],
  providers: [ProcessosService],
  exports: [ProcessosService],
})
export class ProcessosModule {}
