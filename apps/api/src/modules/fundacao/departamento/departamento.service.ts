import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { tenantContext } from '../tenant/tenant-context';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../auditoria/eventos-auditoria';

/**
 * CRUD de Departamento (FR-05; Especificação Técnica do Passo 8) — pré-
 * requisito funcional para a visibilidade RBAC de Gestor em Processos e CRM.
 * `PermissaoGuard` do controlador verifica só a permissão de papel; as
 * regras RD-01/RD-03 (verificação de instância) ficam aqui.
 */
@Injectable()
export class DepartamentoService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async criar(nome: string) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new NotFoundException();
    }

    const departamento = await this.tenantPrisma.client.departamento.create({
      data: { empresaId: ctx.empresaId, nome, criadoPor: ctx.utilizadorId },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'criar',
      entidade: 'Departamento',
      entidadeId: departamento.id,
      detalhe: { dados: { nome } },
    } satisfies EventoAuditoria);

    return departamento;
  }

  async listar() {
    return this.tenantPrisma.client.departamento.findMany({ where: { eliminadoEm: null }, orderBy: { nome: 'asc' } });
  }

  async editar(id: string, nome: string) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new NotFoundException();
    }

    const existente = await this.tenantPrisma.client.departamento.findUnique({ where: { id } });
    if (!existente || existente.eliminadoEm) {
      throw new NotFoundException();
    }

    const nomeAnterior = existente.nome;
    const atualizado = await this.tenantPrisma.client.departamento.update({
      where: { id },
      data: { nome, atualizadoPor: ctx.utilizadorId },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'atualizar',
      entidade: 'Departamento',
      entidadeId: id,
      detalhe: { alteracoes: { nome: { anterior: nomeAnterior, novo: nome } } },
    } satisfies EventoAuditoria);

    return atualizado;
  }

  async eliminar(id: string) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new NotFoundException();
    }

    const existente = await this.tenantPrisma.client.departamento.findUnique({ where: { id } });
    if (!existente || existente.eliminadoEm) {
      throw new NotFoundException();
    }

    // RD-01 — nunca eliminar um Departamento com Utilizadores ativos atribuídos.
    const utilizadoresAtivos = await this.tenantPrisma.client.utilizador.count({
      where: { departamentoId: id, eliminadoEm: null },
    });
    if (utilizadoresAtivos > 0) {
      throw new ConflictException('O Departamento tem Utilizadores ativos atribuídos — reatribui-os antes de eliminar.');
    }

    const eliminadoEm = new Date();
    const atualizado = await this.tenantPrisma.client.departamento.update({
      where: { id },
      data: { eliminadoEm, atualizadoPor: ctx.utilizadorId },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'eliminar',
      entidade: 'Departamento',
      entidadeId: id,
      detalhe: { eliminadoEm },
    } satisfies EventoAuditoria);

    return atualizado;
  }
}
