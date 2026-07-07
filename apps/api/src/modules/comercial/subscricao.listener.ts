import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Papel } from '@prisma/client';
import { TenantPrismaService } from '../fundacao/prisma/tenant-prisma.service';
import { tenantContext } from '../fundacao/tenant/tenant-context';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../fundacao/auditoria/eventos-auditoria';
import { PLANOS_CONFIG } from './planos-config';

/**
 * Criação automática da subscrição de trial (RN-02, FR-30; Especificação
 * Técnica do Passo 19, 3.3) — reage ao mesmo `EVENTO_AUDITORIA` já emitido
 * por `AuthService.registar()` (`fundacao/auth/`), sem que a Fundação
 * conheça a existência deste módulo (System Design Principles, regra #2).
 *
 * O evento chega fora de qualquer pedido HTTP — `tenantContext.run(...)`
 * populariza o contexto explicitamente para esta escrita, primeira
 * utilização em produção de um padrão até agora só usado em testes
 * (`comoTenant()`, Passo 15).
 */
@Injectable()
export class SubscricaoListener {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  @OnEvent(EVENTO_AUDITORIA)
  async aoRegistarEvento(payload: EventoAuditoria): Promise<void> {
    if (payload.acao !== 'criar' || payload.entidade !== 'Empresa') {
      return;
    }

    const limites = PLANOS_CONFIG.professional; // Decisão C — trial no plano Professional

    await tenantContext.run({ utilizadorId: payload.ator, empresaId: payload.empresaId, papel: Papel.admin_empresa }, async () => {
      // `upsert`, nunca `create` — idempotência exigida explicitamente pela
      // Fundadora/CEO: `EventEmitter2` não garante entrega exatamente uma
      // vez, e um replay do mesmo evento `criar`/`Empresa` nunca pode
      // duplicar a subscrição nem reverter um estado já avançado (ex: já
      // convertida para paga por um webhook, Passo 22) para os valores
      // iniciais de trial.
      await this.tenantPrisma.client.subscricaoPlano.upsert({
        where: { empresaId: payload.empresaId },
        create: { empresaId: payload.empresaId, plano: 'professional', estado: 'trial', ...limites },
        update: {},
      });
    });
  }
}
