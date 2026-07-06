import { Injectable } from '@nestjs/common';
import { Papel } from '@prisma/client';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { tenantContext } from '../tenant/tenant-context';
import { DEFAULT_PERMISSION_MATRIX } from './permission-matrix';

/** Owner (Cliente) ou responsável (Processo) — quem tem relação direta com a entidade. */
export interface RelacaoEntidade {
  responsavelId: string;
  /** Departamento da entidade (Processo, direto) ou do owner (Cliente). */
  departamentoId: string | null;
}

/**
 * Descreve o âmbito de visibilidade de uma listagem (Especificação Técnica
 * do Passo 9, 3.2) — a decisão de "quem vê o quê" fica aqui; cada módulo
 * (Processos, CRM) traduz isto na sua própria cláusula Prisma, porque a
 * forma exata difere por schema (não é duplicação de regra).
 */
export type EscopoVisibilidade =
  | { tipo: 'total' }
  | { tipo: 'departamento'; departamentoId: string }
  | { tipo: 'proprio'; utilizadorId: string }
  | { tipo: 'partilhado'; entidadeIds: string[] };

/**
 * Serviço único de autorização (ADR-004, 3.3; Especificação Técnica do
 * Passo 5, 3.3). Responde só a "este papel, com as regras desta Empresa,
 * pode executar esta ação sobre este módulo?" — nunca decide sobre um alvo
 * concreto (isso são regras de negócio específicas de cada endpoint, ver
 * Especificação Técnica do Passo 5, 3.4).
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async podeExecutar(modulo: string, acao: string): Promise<boolean> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      // Fail Secure (Security & Access Principles, 3.9) — sem contexto,
      // nunca permite.
      return false;
    }

    const regra = await this.tenantPrisma.client.regraPermissao.findFirst({
      where: { papel: ctx.papel, modulo, acao },
    });

    if (regra) {
      // Override explícito da Empresa tem sempre prioridade sobre o default.
      return regra.permitido;
    }

    return DEFAULT_PERMISSION_MATRIX[ctx.papel]?.[modulo]?.[acao] ?? false;
  }

  /**
   * Terceira pergunta que este serviço único responde (ADR-004, 3.3, ponto
   * 3; Especificação Técnica do Passo 7, 3.3) — "uma Partilha ativa concede
   * acesso a ESTA entidade ao utilizador ATUAL?". Semântica pura: não decide
   * sozinho se o pedido deve ser aceite — módulos futuros (Processos, CRM)
   * que definirem a sua própria visibilidade por RBAC chamam este método
   * como fallback, especificamente para o papel Convidado.
   */
  async podeAcederViaPartilha(entidadeTipo: string, entidadeId: string): Promise<boolean> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      return false; // Fail Secure — mesmo padrão de podeExecutar.
    }

    const partilha = await this.tenantPrisma.client.partilha.findFirst({
      where: {
        entidadeTipo,
        entidadeId,
        convidadoId: ctx.utilizadorId,
        revogadoEm: null,
      },
    });

    return partilha !== null;
  }

  /**
   * Resolve a relação direta de owner/responsável e Departamento de uma
   * entidade (`cliente` ou `processo`) — movido de `PartilhaService`
   * (Passo 7) para aqui, tornado público e genérico (Especificação Técnica
   * do Passo 9, 2.2/3.2), para ser reutilizado por qualquer módulo de
   * negócio sem duplicar esta consulta.
   */
  async obterRelacaoEntidade(entidadeTipo: string, entidadeId: string): Promise<RelacaoEntidade | null> {
    if (entidadeTipo === 'cliente') {
      const cliente = await this.tenantPrisma.client.cliente.findUnique({
        where: { id: entidadeId },
        include: { owner: true },
      });
      if (!cliente || cliente.eliminadoEm) {
        return null;
      }
      return { responsavelId: cliente.ownerId, departamentoId: cliente.owner.departamentoId };
    }

    const processo = await this.tenantPrisma.client.processo.findUnique({ where: { id: entidadeId } });
    if (!processo || processo.eliminadoEm) {
      return null;
    }
    return { responsavelId: processo.responsavelId, departamentoId: processo.departamentoId };
  }

  /**
   * P1 (admin_empresa) / P2 (gestor, por Departamento) / P3 (colaborador,
   * por posse) — mesma regra já usada em `PartilhaService` (Passo 7),
   * agora centralizada e reutilizável por qualquer módulo de negócio
   * (Especificação Técnica do Passo 9, 3.2). `convidado` nunca tem
   * autoridade de ação sobre uma entidade (só leitura via
   * `podeAcederViaPartilha`) — retorna sempre `false` para esse papel.
   */
  async podeAgirSobreEntidade(entidadeTipo: string, entidadeId: string): Promise<boolean> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      return false;
    }

    if (ctx.papel === Papel.convidado) {
      return false;
    }

    const relacao = await this.obterRelacaoEntidade(entidadeTipo, entidadeId);
    if (!relacao) {
      return false;
    }

    if (ctx.papel === Papel.admin_empresa) {
      return true;
    }

    if (ctx.papel === Papel.gestor) {
      const gestor = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: ctx.utilizadorId } });
      return !!gestor?.departamentoId && relacao.departamentoId === gestor.departamentoId;
    }

    // colaborador — só sobre entidades de que é diretamente owner/responsável.
    return relacao.responsavelId === ctx.utilizadorId;
  }

  /**
   * Âmbito de visibilidade para uma listagem de `entidadeTipo` (Especificação
   * Técnica do Passo 9, 3.2) — `gestor` sem Departamento cai em `proprio`
   * (Fail Secure, nunca assume "vê tudo" na ausência de Departamento).
   */
  async obterEscopoVisibilidade(entidadeTipo: string): Promise<EscopoVisibilidade> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      return { tipo: 'proprio', utilizadorId: '' };
    }

    if (ctx.papel === Papel.admin_empresa) {
      return { tipo: 'total' };
    }

    if (ctx.papel === Papel.convidado) {
      const partilhas = await this.tenantPrisma.client.partilha.findMany({
        where: { entidadeTipo, convidadoId: ctx.utilizadorId, revogadoEm: null },
        select: { entidadeId: true },
      });
      return { tipo: 'partilhado', entidadeIds: partilhas.map((p) => p.entidadeId) };
    }

    if (ctx.papel === Papel.gestor) {
      const gestor = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: ctx.utilizadorId } });
      if (gestor?.departamentoId) {
        return { tipo: 'departamento', departamentoId: gestor.departamentoId };
      }
      // Fail Secure — Gestor sem Departamento nunca "vê tudo" por omissão.
      return { tipo: 'proprio', utilizadorId: ctx.utilizadorId };
    }

    // colaborador.
    return { tipo: 'proprio', utilizadorId: ctx.utilizadorId };
  }
}
