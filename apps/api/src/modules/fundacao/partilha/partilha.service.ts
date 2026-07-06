import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Papel } from '@prisma/client';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { tenantContext } from '../tenant/tenant-context';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../auditoria/eventos-auditoria';
import { AuthorizationService } from '../autorizacao/authorization.service';
import { EntidadePartilhavel } from './dto/conceder-partilha.dto';

/**
 * Mecanismo de Partilha (FR-35; Especificação Técnica do Passo 7) — concede
 * ao papel Convidado a sua única via de acesso a uma entidade específica.
 * Autoridade de conceder/revogar segue as regras P1-P5 (3.4 desse
 * documento): o `PermissaoGuard` do controlador só verifica a permissão de
 * papel (ação `fundacao.conceder_partilha`/`revogar_partilha`); a
 * verificação de instância (P1-P3) usa `AuthorizationService.obterRelacaoEntidade`/
 * `podeAgirSobreEntidade` (centralizados no Passo 9, 3.2/3.3 — antes uma
 * cópia privada deste serviço, movida para evitar duplicação com Processos/CRM).
 */
@Injectable()
export class PartilhaService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async conceder(entidadeTipo: EntidadePartilhavel, entidadeId: string, convidadoId: string) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    const relacao = await this.authorizationService.obterRelacaoEntidade(entidadeTipo, entidadeId);
    if (!relacao) {
      throw new NotFoundException('Entidade a partilhar não encontrada.');
    }

    // P5 — o convidado alvo tem de ser Utilizador da mesma Empresa com papel Convidado.
    const convidado = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: convidadoId } });
    if (!convidado || convidado.papel !== Papel.convidado || convidado.eliminadoEm) {
      throw new ForbiddenException('O convidado tem de ser um Utilizador da Empresa com papel Convidado.');
    }

    // P1-P3 — relação direta do concedente com a entidade concreta.
    if (!(await this.authorizationService.podeAgirSobreEntidade(entidadeTipo, entidadeId))) {
      throw new ForbiddenException('Não tens autoridade sobre esta entidade para conceder Partilha.');
    }

    // `empresaId` é sempre reescrito pela Camada 1 (TenantPrismaService) com
    // o valor real do TenantContext — indicado aqui só para satisfazer o
    // tipo estático de `create` (a extensão não estreita esse tipo).
    const partilha = await this.tenantPrisma.client.partilha.create({
      data: { empresaId: ctx.empresaId, entidadeTipo, entidadeId, convidadoId, concedidoPorId: ctx.utilizadorId },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'criar',
      entidade: 'Partilha',
      entidadeId: partilha.id,
      detalhe: { entidadeTipo, entidadeId, convidadoId },
    } satisfies EventoAuditoria);

    return partilha;
  }

  async revogar(id: string) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    const partilha = await this.tenantPrisma.client.partilha.findUnique({ where: { id } });
    if (!partilha || partilha.revogadoEm) {
      throw new NotFoundException();
    }

    // P1-P3 avaliadas contra o estado ATUAL da entidade, não contra quem a
    // concedeu originalmente (Especificação Técnica do Passo 7, 3.4).
    const relacao = await this.authorizationService.obterRelacaoEntidade(partilha.entidadeTipo, partilha.entidadeId);
    if (!relacao) {
      throw new NotFoundException('Entidade partilhada já não existe.');
    }
    if (!(await this.authorizationService.podeAgirSobreEntidade(partilha.entidadeTipo, partilha.entidadeId))) {
      throw new ForbiddenException('Não tens autoridade sobre esta entidade para revogar a Partilha.');
    }

    const revogadoEm = new Date();
    const atualizada = await this.tenantPrisma.client.partilha.update({
      where: { id },
      data: { revogadoEm },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'eliminar',
      entidade: 'Partilha',
      entidadeId: id,
      detalhe: { revogadoEm },
    } satisfies EventoAuditoria);

    return atualizada;
  }

  async listar(take: number, skip: number) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new ForbiddenException();
    }

    if (ctx.papel === Papel.admin_empresa) {
      return this.tenantPrisma.client.partilha.findMany({ take, skip, orderBy: { createdAt: 'desc' } });
    }

    if (ctx.papel === Papel.convidado) {
      return this.tenantPrisma.client.partilha.findMany({
        where: { convidadoId: ctx.utilizadorId },
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      });
    }

    if (ctx.papel === Papel.gestor) {
      const gestor = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: ctx.utilizadorId } });
      const [processosDoDept, clientesDoDept] = await Promise.all([
        gestor?.departamentoId
          ? this.tenantPrisma.client.processo.findMany({ where: { departamentoId: gestor.departamentoId }, select: { id: true } })
          : Promise.resolve([]),
        gestor?.departamentoId
          ? this.tenantPrisma.client.cliente.findMany({
              where: { owner: { departamentoId: gestor.departamentoId } },
              select: { id: true },
            })
          : Promise.resolve([]),
      ]);

      return this.tenantPrisma.client.partilha.findMany({
        where: {
          OR: [
            { concedidoPorId: ctx.utilizadorId },
            { entidadeTipo: 'processo', entidadeId: { in: processosDoDept.map((p) => p.id) } },
            { entidadeTipo: 'cliente', entidadeId: { in: clientesDoDept.map((c) => c.id) } },
          ],
        },
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      });
    }

    // colaborador — só as que concedeu.
    return this.tenantPrisma.client.partilha.findMany({
      where: { concedidoPorId: ctx.utilizadorId },
      take,
      skip,
      orderBy: { createdAt: 'desc' },
    });
  }
}
