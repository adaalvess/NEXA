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
 */
@Module({
  imports: [FundacaoModule],
  controllers: [ProcessosController],
  providers: [ProcessosService],
})
export class ProcessosModule {}
