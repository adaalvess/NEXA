import { Module } from '@nestjs/common';
import { FundacaoModule } from '../fundacao/fundacao.module';
import { ComercialController } from './comercial.controller';
import { SubscricaoListener } from './subscricao.listener';

/**
 * Módulo `comercial` (Especificação Técnica do Passo 19) — já antecipado
 * desde a regra não-negociável #1 ("Módulos: fundacao, dashboard,
 * processos, crm, ia, comercial"), agora construído. Importa
 * `FundacaoModule` para `TenantPrismaService`/`PermissaoGuard`/`SessionGuard`,
 * mesma disciplina de todos os módulos de negócio — nunca o inverso:
 * `FundacaoModule` nunca importa `ComercialModule` (toda a lógica de
 * subscrição, estados e limites fica centralizada aqui, exposta a outros
 * módulos via serviços, nunca o contrário).
 */
@Module({
  imports: [FundacaoModule],
  controllers: [ComercialController],
  providers: [SubscricaoListener],
})
export class ComercialModule {}
