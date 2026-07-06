import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoOportunidade, Papel, Prisma } from '@prisma/client';
import { TenantPrismaService } from '../fundacao/prisma/tenant-prisma.service';
import { tenantContext } from '../fundacao/tenant/tenant-context';
import { AuthorizationService } from '../fundacao/autorizacao/authorization.service';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../fundacao/auditoria/eventos-auditoria';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { EditarClienteDto } from './dto/editar-cliente.dto';
import { CriarInteracaoDto } from './dto/criar-interacao.dto';

const ESTADOS_OPORTUNIDADE_PIPELINE: EstadoOportunidade[] = ['prospecao', 'negociacao', 'fechada_ganha', 'fechada_perdida'];

/**
 * CRM Inteligente (FR-19 a FR-22; Especificação Técnica do Passo 10) —
 * segundo módulo de negócio fora da Fundação. Reutiliza integralmente a
 * visibilidade centralizada do `AuthorizationService` (Passo 9, Decisão B
 * do M2) — nenhuma lógica de visibilidade própria. Sem eliminação de
 * Cliente neste passo (2.1.D da especificação).
 */
@Injectable()
export class CrmService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async criarCliente(dto: CriarClienteDto) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    await this.validarOwner(dto.ownerId);

    const cliente = await this.tenantPrisma.client.cliente.create({
      data: {
        empresaId: ctx.empresaId,
        nome: dto.nome,
        tipo: dto.tipo,
        contactoPrincipal: dto.contactoPrincipal,
        ownerId: dto.ownerId,
        estadoOportunidade: dto.estadoOportunidade,
        criadoPor: ctx.utilizadorId,
      },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'criar',
      entidade: 'Cliente',
      entidadeId: cliente.id,
      detalhe: { dados: { nome: dto.nome, tipo: dto.tipo, ownerId: dto.ownerId } },
    } satisfies EventoAuditoria);

    return cliente;
  }

  async listarClientes(take: number, skip: number) {
    const escopo = await this.authorizationService.obterEscopoVisibilidade('cliente');
    const where: Prisma.ClienteWhereInput = { eliminadoEm: null };

    if (escopo.tipo === 'departamento') {
      where.owner = { departamentoId: escopo.departamentoId };
    } else if (escopo.tipo === 'proprio') {
      where.ownerId = escopo.utilizadorId;
    } else if (escopo.tipo === 'partilhado') {
      where.id = { in: escopo.entidadeIds };
    }

    return this.tenantPrisma.client.cliente.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } });
  }

  async obterCliente(id: string) {
    const cliente = await this.tenantPrisma.client.cliente.findUnique({ where: { id } });
    if (!cliente || cliente.eliminadoEm) {
      throw new NotFoundException();
    }

    if (!(await this.podeVerCliente(id))) {
      throw new ForbiddenException();
    }

    return cliente;
  }

  async editarCliente(id: string, dto: EditarClienteDto) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    const existente = await this.tenantPrisma.client.cliente.findUnique({ where: { id } });
    if (!existente || existente.eliminadoEm) {
      throw new NotFoundException();
    }

    if (!(await this.authorizationService.podeAgirSobreEntidade('cliente', id))) {
      throw new ForbiddenException();
    }

    if (dto.ownerId !== undefined && dto.ownerId !== existente.ownerId) {
      await this.validarOwner(dto.ownerId);
    }

    const data: Prisma.ClienteUncheckedUpdateInput = { atualizadoPor: ctx.utilizadorId };
    const alteracoes: Record<string, { anterior: unknown; novo: unknown }> = {};

    if (dto.nome !== undefined && dto.nome !== existente.nome) {
      alteracoes.nome = { anterior: existente.nome, novo: dto.nome };
      data.nome = dto.nome;
    }
    if (dto.tipo !== undefined && dto.tipo !== existente.tipo) {
      alteracoes.tipo = { anterior: existente.tipo, novo: dto.tipo };
      data.tipo = dto.tipo;
    }
    if (dto.contactoPrincipal !== undefined && dto.contactoPrincipal !== existente.contactoPrincipal) {
      alteracoes.contactoPrincipal = { anterior: existente.contactoPrincipal, novo: dto.contactoPrincipal };
      data.contactoPrincipal = dto.contactoPrincipal;
    }
    if (dto.ownerId !== undefined && dto.ownerId !== existente.ownerId) {
      alteracoes.ownerId = { anterior: existente.ownerId, novo: dto.ownerId };
      data.ownerId = dto.ownerId;
    }
    if (dto.estadoOportunidade !== undefined && dto.estadoOportunidade !== existente.estadoOportunidade) {
      alteracoes.estadoOportunidade = { anterior: existente.estadoOportunidade, novo: dto.estadoOportunidade };
      data.estadoOportunidade = dto.estadoOportunidade;
    }

    const atualizado = await this.tenantPrisma.client.cliente.update({ where: { id }, data });

    if (Object.keys(alteracoes).length > 0) {
      await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
        empresaId: ctx.empresaId,
        ator: ctx.utilizadorId,
        acao: 'atualizar',
        entidade: 'Cliente',
        entidadeId: id,
        detalhe: { alteracoes },
      } satisfies EventoAuditoria);
    }

    return atualizado;
  }

  async criarInteracao(clienteId: string, dto: CriarInteracaoDto) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    const cliente = await this.tenantPrisma.client.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente || cliente.eliminadoEm) {
      throw new NotFoundException();
    }

    // IR-01 — mesma autoridade de edição sobre o Cliente; convidado nunca (mesmo com Partilha, nivelAcesso é sempre leitura).
    if (!(await this.authorizationService.podeAgirSobreEntidade('cliente', clienteId))) {
      throw new ForbiddenException();
    }

    // CR-06 — contactoPrincipal obrigatório antes da primeira Interação.
    const totalInteracoes = await this.tenantPrisma.client.interacao.count({ where: { clienteId } });
    if (totalInteracoes === 0 && !cliente.contactoPrincipal) {
      throw new BadRequestException('O Cliente precisa de ter um contacto principal antes de registar a primeira Interação.');
    }

    const interacao = await this.tenantPrisma.client.interacao.create({
      data: {
        empresaId: ctx.empresaId,
        clienteId,
        tipo: dto.tipo,
        descricao: dto.descricao,
        data: dto.data ? new Date(dto.data) : undefined,
        criadoPor: ctx.utilizadorId,
      },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'criar',
      entidade: 'Interacao',
      entidadeId: interacao.id,
      detalhe: { dados: { clienteId, tipo: dto.tipo } },
    } satisfies EventoAuditoria);

    return interacao;
  }

  async listarInteracoes(clienteId: string) {
    const cliente = await this.tenantPrisma.client.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente || cliente.eliminadoEm) {
      throw new NotFoundException();
    }

    if (!(await this.podeVerCliente(clienteId))) {
      throw new ForbiddenException();
    }

    return this.tenantPrisma.client.interacao.findMany({ where: { clienteId }, orderBy: { data: 'desc' } });
  }

  async pipeline() {
    const escopo = await this.authorizationService.obterEscopoVisibilidade('cliente');
    const where: Prisma.ClienteWhereInput = { eliminadoEm: null, estadoOportunidade: { not: null } };

    if (escopo.tipo === 'departamento') {
      where.owner = { departamentoId: escopo.departamentoId };
    } else if (escopo.tipo === 'proprio') {
      where.ownerId = escopo.utilizadorId;
    } else if (escopo.tipo === 'partilhado') {
      where.id = { in: escopo.entidadeIds };
    }

    const clientes = await this.tenantPrisma.client.cliente.findMany({ where, orderBy: { createdAt: 'desc' } });

    const resultado: Record<string, typeof clientes> = {};
    for (const estado of ESTADOS_OPORTUNIDADE_PIPELINE) {
      resultado[estado] = clientes.filter((c) => c.estadoOportunidade === estado);
    }
    return resultado;
  }

  private async podeVerCliente(id: string): Promise<boolean> {
    const ctx = tenantContext.getStore();
    if (await this.authorizationService.podeAgirSobreEntidade('cliente', id)) {
      return true;
    }
    return ctx?.papel === Papel.convidado && (await this.authorizationService.podeAcederViaPartilha('cliente', id));
  }

  /** CR-02/CR-03 — na criação/edição, gestor só para o seu Departamento, colaborador só para si mesmo. */
  private async validarOwner(ownerId: string): Promise<void> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    if (ctx.papel === Papel.admin_empresa) {
      return;
    }

    const owner = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: ownerId } });
    if (!owner || owner.eliminadoEm) {
      throw new NotFoundException('Utilizador responsável não encontrado.');
    }

    if (ctx.papel === Papel.gestor) {
      const gestor = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: ctx.utilizadorId } });
      if (!gestor?.departamentoId || owner.departamentoId !== gestor.departamentoId) {
        throw new ForbiddenException('Só podes atribuir Clientes a Utilizadores do teu próprio Departamento/Equipa.');
      }
      return;
    }

    // colaborador — só para si mesmo.
    if (ownerId !== ctx.utilizadorId) {
      throw new ForbiddenException('Só podes criar/editar Clientes de que és o próprio owner.');
    }
  }
}
