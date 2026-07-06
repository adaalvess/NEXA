import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { TenantPrismaService } from '../fundacao/prisma/tenant-prisma.service';
import { tenantContext } from '../fundacao/tenant/tenant-context';
import { AuthorizationService, EscopoVisibilidade } from '../fundacao/autorizacao/authorization.service';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../fundacao/auditoria/eventos-auditoria';

/**
 * Dashboard Inteligente (FR-11 a FR-13; Especificação Técnica do Passo 12)
 * — terceiro módulo de negócio, "sem entidade própria" (Functional
 * Specifications, 3.2). Reutiliza integralmente `obterEscopoVisibilidade`
 * (Passo 9) — zero alterações ao `AuthorizationService`, terceira
 * confirmação prática da Decisão B do M2.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async obterDashboard() {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    const whereProcesso = await this.construirWhereProcesso();
    const whereCliente = await this.construirWhereCliente();

    const [totalProcessos, porFazer, emCurso, concluida, emAtraso, totalClientes, comOportunidadeAtiva, naoLidas] = await Promise.all([
      this.tenantPrisma.client.processo.count({ where: whereProcesso }),
      this.tenantPrisma.client.processo.count({ where: { ...whereProcesso, estado: 'por_fazer' } }),
      this.tenantPrisma.client.processo.count({ where: { ...whereProcesso, estado: 'em_curso' } }),
      this.tenantPrisma.client.processo.count({ where: { ...whereProcesso, estado: 'concluida' } }),
      this.tenantPrisma.client.processo.count({
        where: { ...whereProcesso, estado: { not: 'concluida' }, prazo: { lt: new Date() } },
      }),
      this.tenantPrisma.client.cliente.count({ where: whereCliente }),
      this.tenantPrisma.client.cliente.count({
        where: { ...whereCliente, estadoOportunidade: { in: ['prospecao', 'negociacao'] } },
      }),
      this.tenantPrisma.client.notificacao.count({ where: { destinatarioId: ctx.utilizadorId, lida: false } }),
    ]);

    // FR-12 — estado inicial guiado, quando não há Processos nem Clientes visíveis.
    if (totalProcessos === 0 && totalClientes === 0) {
      return {
        estadoInicial: true,
        sugestoes: [
          { acao: 'criar_processo', modulo: 'processos' },
          { acao: 'criar_cliente', modulo: 'crm' },
        ],
      };
    }

    return {
      processos: { total: totalProcessos, porEstado: { por_fazer: porFazer, em_curso: emCurso, concluida }, emAtraso },
      clientes: { total: totalClientes, comOportunidadeAtiva },
      notificacoes: { naoLidas },
    };
  }

  async listarNotificacoes(take: number, skip: number, lida?: boolean) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    const where: Prisma.NotificacaoWhereInput = { destinatarioId: ctx.utilizadorId };
    if (lida !== undefined) {
      where.lida = lida;
    }

    return this.tenantPrisma.client.notificacao.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } });
  }

  async marcarComoLida(id: string) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    const notificacao = await this.tenantPrisma.client.notificacao.findUnique({ where: { id } });
    if (!notificacao || notificacao.destinatarioId !== ctx.utilizadorId) {
      throw new NotFoundException();
    }

    if (notificacao.lida) {
      return notificacao;
    }

    const atualizada = await this.tenantPrisma.client.notificacao.update({ where: { id }, data: { lida: true } });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'atualizar',
      entidade: 'Notificacao',
      entidadeId: id,
      detalhe: { alteracoes: { lida: { anterior: false, novo: true } } },
    } satisfies EventoAuditoria);

    return atualizada;
  }

  private async construirWhereProcesso(): Promise<Prisma.ProcessoWhereInput> {
    const escopo = await this.authorizationService.obterEscopoVisibilidade('processo');
    const where: Prisma.ProcessoWhereInput = { eliminadoEm: null };
    this.aplicarEscopo(where, escopo, 'departamentoId', 'responsavelId');
    return where;
  }

  private async construirWhereCliente(): Promise<Prisma.ClienteWhereInput> {
    const escopo = await this.authorizationService.obterEscopoVisibilidade('cliente');
    const where: Prisma.ClienteWhereInput = { eliminadoEm: null };
    if (escopo.tipo === 'departamento') {
      where.owner = { departamentoId: escopo.departamentoId };
    } else if (escopo.tipo === 'proprio') {
      where.ownerId = escopo.utilizadorId;
    } else if (escopo.tipo === 'partilhado') {
      where.id = { in: escopo.entidadeIds };
    }
    return where;
  }

  /** Tradução genérica para modelos com `departamentoId` direto (Processo). */
  private aplicarEscopo(
    where: Record<string, unknown>,
    escopo: EscopoVisibilidade,
    campoDepartamento: string,
    campoResponsavel: string,
  ): void {
    if (escopo.tipo === 'departamento') {
      where[campoDepartamento] = escopo.departamentoId;
    } else if (escopo.tipo === 'proprio') {
      where[campoResponsavel] = escopo.utilizadorId;
    } else if (escopo.tipo === 'partilhado') {
      where.id = { in: escopo.entidadeIds };
    }
  }
}
