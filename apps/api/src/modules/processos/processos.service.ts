import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Papel, Prisma } from '@prisma/client';
import { TenantPrismaService } from '../fundacao/prisma/tenant-prisma.service';
import { tenantContext } from '../fundacao/tenant/tenant-context';
import { AuthorizationService } from '../fundacao/autorizacao/authorization.service';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../fundacao/auditoria/eventos-auditoria';
import { CriarProcessoDto } from './dto/criar-processo.dto';
import { EditarProcessoDto } from './dto/editar-processo.dto';

/**
 * Gestão de Processos e Tarefas (FR-14 a FR-18; Especificação Técnica do
 * Passo 9) — primeiro módulo de negócio fora da Fundação. Autoridade de
 * instância (PR-01 a PR-07) implementada aqui, consultando o
 * `AuthorizationService` centralizado (3.2/3.3 desse documento) para
 * `obterRelacaoEntidade`/`podeAgirSobreEntidade`/`obterEscopoVisibilidade`
 * — nunca uma cópia local desta lógica (Decisão B do M2).
 */
@Injectable()
export class ProcessosService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async criar(dto: CriarProcessoDto) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    const departamentoId = await this.validarResponsavelEDepartamentoParaCriacao(dto.responsavelId, dto.departamentoId);

    if (dto.clienteId) {
      await this.validarVisibilidadeCliente(dto.clienteId);
    }

    const processo = await this.tenantPrisma.client.processo.create({
      data: {
        empresaId: ctx.empresaId,
        titulo: dto.titulo,
        descricao: dto.descricao,
        responsavelId: dto.responsavelId,
        departamentoId,
        clienteId: dto.clienteId ?? null,
        prazo: dto.prazo ? new Date(dto.prazo) : undefined,
        criadoPor: ctx.utilizadorId,
      },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'criar',
      entidade: 'Processo',
      entidadeId: processo.id,
      detalhe: { dados: { titulo: dto.titulo, responsavelId: dto.responsavelId, departamentoId, clienteId: dto.clienteId ?? null } },
    } satisfies EventoAuditoria);

    return processo;
  }

  async listar(take: number, skip: number) {
    const escopo = await this.authorizationService.obterEscopoVisibilidade('processo');
    const where: Prisma.ProcessoWhereInput = { eliminadoEm: null };

    if (escopo.tipo === 'departamento') {
      where.departamentoId = escopo.departamentoId;
    } else if (escopo.tipo === 'proprio') {
      where.responsavelId = escopo.utilizadorId;
    } else if (escopo.tipo === 'partilhado') {
      where.id = { in: escopo.entidadeIds };
    }

    return this.tenantPrisma.client.processo.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } });
  }

  async obter(id: string) {
    const processo = await this.tenantPrisma.client.processo.findUnique({ where: { id } });
    if (!processo || processo.eliminadoEm) {
      throw new NotFoundException();
    }

    if (!(await this.podeVerProcesso(id))) {
      throw new ForbiddenException();
    }

    return processo;
  }

  async editar(id: string, dto: EditarProcessoDto) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    const existente = await this.tenantPrisma.client.processo.findUnique({ where: { id } });
    if (!existente || existente.eliminadoEm) {
      throw new NotFoundException();
    }

    if (!(await this.authorizationService.podeAgirSobreEntidade('processo', id))) {
      throw new ForbiddenException();
    }

    const data: Prisma.ProcessoUncheckedUpdateInput = { atualizadoPor: ctx.utilizadorId };
    const alteracoes: Record<string, { anterior: unknown; novo: unknown }> = {};

    if (dto.titulo !== undefined && dto.titulo !== existente.titulo) {
      alteracoes.titulo = { anterior: existente.titulo, novo: dto.titulo };
      data.titulo = dto.titulo;
    }
    if (dto.descricao !== undefined && dto.descricao !== existente.descricao) {
      alteracoes.descricao = { anterior: existente.descricao, novo: dto.descricao };
      data.descricao = dto.descricao;
    }
    if (dto.estado !== undefined && dto.estado !== existente.estado) {
      alteracoes.estado = { anterior: existente.estado, novo: dto.estado };
      data.estado = dto.estado;
    }
    if (dto.prazo !== undefined) {
      const novoPrazo = dto.prazo === null ? null : new Date(dto.prazo);
      data.prazo = novoPrazo;
      alteracoes.prazo = { anterior: existente.prazo, novo: novoPrazo };
    }
    if (dto.responsavelId !== undefined && dto.responsavelId !== existente.responsavelId) {
      await this.validarResponsavelParaEdicao(dto.responsavelId, dto.departamentoId ?? existente.departamentoId);
      alteracoes.responsavelId = { anterior: existente.responsavelId, novo: dto.responsavelId };
      data.responsavelId = dto.responsavelId;
    }
    if (dto.departamentoId !== undefined && dto.departamentoId !== existente.departamentoId) {
      if (dto.departamentoId) {
        await this.validarDepartamento(dto.departamentoId);
      }
      alteracoes.departamentoId = { anterior: existente.departamentoId, novo: dto.departamentoId };
      data.departamentoId = dto.departamentoId;
    }
    if (dto.clienteId !== undefined && dto.clienteId !== existente.clienteId) {
      if (dto.clienteId) {
        await this.validarVisibilidadeCliente(dto.clienteId);
      }
      alteracoes.clienteId = { anterior: existente.clienteId, novo: dto.clienteId };
      data.clienteId = dto.clienteId;
    }

    const atualizado = await this.tenantPrisma.client.processo.update({ where: { id }, data });

    if (Object.keys(alteracoes).length > 0) {
      await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
        empresaId: ctx.empresaId,
        ator: ctx.utilizadorId,
        acao: 'atualizar',
        entidade: 'Processo',
        entidadeId: id,
        detalhe: { alteracoes },
      } satisfies EventoAuditoria);
    }

    return atualizado;
  }

  async eliminar(id: string) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    const existente = await this.tenantPrisma.client.processo.findUnique({ where: { id } });
    if (!existente || existente.eliminadoEm) {
      throw new NotFoundException();
    }

    if (!(await this.authorizationService.podeAgirSobreEntidade('processo', id))) {
      throw new ForbiddenException();
    }

    const eliminadoEm = new Date();
    const atualizado = await this.tenantPrisma.client.processo.update({
      where: { id },
      data: { eliminadoEm, atualizadoPor: ctx.utilizadorId },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'eliminar',
      entidade: 'Processo',
      entidadeId: id,
      detalhe: { eliminadoEm },
    } satisfies EventoAuditoria);

    return atualizado;
  }

  private async podeVerProcesso(id: string): Promise<boolean> {
    const ctx = tenantContext.getStore();
    if (await this.authorizationService.podeAgirSobreEntidade('processo', id)) {
      return true;
    }
    return ctx?.papel === Papel.convidado && (await this.authorizationService.podeAcederViaPartilha('processo', id));
  }

  /** PR-05 — visibilidade sobre o Cliente associado (FR-16, UC-03 E1). */
  private async validarVisibilidadeCliente(clienteId: string): Promise<void> {
    if (!(await this.authorizationService.podeAgirSobreEntidade('cliente', clienteId))) {
      throw new ForbiddenException('Não tens permissão de visualização sobre este Cliente.');
    }
  }

  /** RD-03-equivalente (Passo 8) — Departamento tem de existir, ser da Empresa, não eliminado. */
  private async validarDepartamento(departamentoId: string): Promise<void> {
    const departamento = await this.tenantPrisma.client.departamento.findUnique({ where: { id: departamentoId } });
    if (!departamento || departamento.eliminadoEm) {
      throw new NotFoundException('Departamento não encontrado.');
    }
  }

  /**
   * PR-02/PR-03 — na criação: `admin_empresa` sem restrição; `gestor` só
   * pode atribuir a alguém do seu próprio Departamento (e o Departamento do
   * Processo, se omitido, herda o do Gestor); `colaborador` só a si mesmo.
   * Devolve o `departamentoId` final a gravar.
   */
  private async validarResponsavelEDepartamentoParaCriacao(
    responsavelId: string,
    departamentoIdFornecido: string | null | undefined,
  ): Promise<string | null> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    if (departamentoIdFornecido) {
      await this.validarDepartamento(departamentoIdFornecido);
    }

    if (ctx.papel === Papel.admin_empresa) {
      return departamentoIdFornecido ?? null;
    }

    const responsavel = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: responsavelId } });
    if (!responsavel || responsavel.eliminadoEm) {
      throw new NotFoundException('Responsável não encontrado.');
    }

    if (ctx.papel === Papel.gestor) {
      const gestor = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: ctx.utilizadorId } });
      if (!gestor?.departamentoId || responsavel.departamentoId !== gestor.departamentoId) {
        throw new ForbiddenException('Só podes atribuir Processos a Utilizadores do teu próprio Departamento/Equipa.');
      }
      if (departamentoIdFornecido !== undefined && departamentoIdFornecido !== null && departamentoIdFornecido !== gestor.departamentoId) {
        throw new ForbiddenException('Só podes associar Processos ao teu próprio Departamento/Equipa.');
      }
      return departamentoIdFornecido === undefined ? gestor.departamentoId : departamentoIdFornecido;
    }

    // colaborador — só para si mesmo.
    if (responsavelId !== ctx.utilizadorId) {
      throw new ForbiddenException('Só podes criar Processos para ti mesmo.');
    }
    if (departamentoIdFornecido !== undefined && departamentoIdFornecido !== null && departamentoIdFornecido !== responsavel.departamentoId) {
      throw new ForbiddenException('Só podes associar Processos ao teu próprio Departamento/Equipa.');
    }
    return departamentoIdFornecido === undefined ? responsavel.departamentoId : departamentoIdFornecido;
  }

  /** PR-02/PR-03 aplicadas à edição — mesmas regras da criação, sem o auto-preenchimento de Departamento. */
  private async validarResponsavelParaEdicao(responsavelId: string, departamentoIdAtualOuNovo: string | null): Promise<void> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    if (ctx.papel === Papel.admin_empresa) {
      return;
    }

    const responsavel = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: responsavelId } });
    if (!responsavel || responsavel.eliminadoEm) {
      throw new NotFoundException('Responsável não encontrado.');
    }

    if (ctx.papel === Papel.gestor) {
      const gestor = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: ctx.utilizadorId } });
      if (!gestor?.departamentoId || responsavel.departamentoId !== gestor.departamentoId || departamentoIdAtualOuNovo !== gestor.departamentoId) {
        throw new ForbiddenException('Só podes atribuir Processos a Utilizadores do teu próprio Departamento/Equipa.');
      }
      return;
    }

    if (responsavelId !== ctx.utilizadorId) {
      throw new ForbiddenException('Só podes atribuir Processos a ti mesmo.');
    }
  }
}
