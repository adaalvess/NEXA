import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { tenantContext } from '../tenant/tenant-context';
import { DEFAULT_PERMISSION_MATRIX } from './permission-matrix';

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
}
