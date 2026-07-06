import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Papel } from '@prisma/client';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { tenantContext } from '../tenant/tenant-context';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../auditoria/eventos-auditoria';

/**
 * Hierarquia de privilégio dentro de uma Empresa (Especificação Técnica do
 * Passo 5, 3.4, L2) — número menor = mais privilegiado. `super_admin` fica
 * fora desta hierarquia: nunca atribuível por ninguém dentro de uma Empresa
 * cliente (RN-04), por isso não tem entrada aqui — qualquer tentativa de o
 * atribuir já foi rejeitada na fronteira única (DTO, L4) antes de chegar aqui.
 */
const PRIVILEGIO: Record<Exclude<Papel, 'super_admin'>, number> = {
  [Papel.admin_empresa]: 1,
  [Papel.gestor]: 2,
  [Papel.colaborador]: 3,
  [Papel.convidado]: 4,
};

@Injectable()
export class UtilizadoresService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Implementa a ordem de verificação completa da Especificação Técnica do
   * Passo 5, 3.4: L1 (auto-alteração) → L2 (hierarquia) → L3 (RN-03, âmbito
   * do Gestor) → L5 (RN-01, nunca zero admins). L4 (nunca super_admin) já
   * foi validado na fronteira única (DTO). L6 (isolamento de tenant) é
   * garantido estruturalmente pelo `TenantPrismaService` (Passo 4) — todo
   * acesso aqui já está confinado à Empresa do `TenantContext`.
   */
  async atribuirPapel(alvoId: string, novoPapel: Exclude<Papel, 'super_admin'>) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    // L1 — nunca alterar o próprio papel.
    if (alvoId === ctx.utilizadorId) {
      throw new ForbiddenException('Não é permitido alterar o próprio papel.');
    }

    // L2 — nunca atribuir um papel com privilégio maior do que o do ator.
    if (PRIVILEGIO[novoPapel] < PRIVILEGIO[ctx.papel as Exclude<Papel, 'super_admin'>]) {
      throw new ForbiddenException('Não é permitido atribuir um papel com privilégio maior do que o teu.');
    }

    // L6 (estrutural): esta query já está confinada à Empresa do ator.
    const alvo = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: alvoId } });
    if (!alvo) {
      throw new NotFoundException();
    }

    // L3 — RN-03: Gestor só atua dentro do seu próprio Departamento/Equipa.
    if (ctx.papel === Papel.gestor) {
      const gestor = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: ctx.utilizadorId } });
      if (!gestor?.departamentoId || alvo.departamentoId !== gestor.departamentoId) {
        throw new ForbiddenException('Só podes atribuir papéis dentro do teu próprio Departamento/Equipa.');
      }
    }

    // L5 — RN-01: a Empresa nunca fica sem nenhum admin_empresa.
    // Nota: verificação seguida de escrita, não uma única transação atómica —
    // janela de corrida teórica aceitável à escala do MVP (Data & Consistency
    // Rules, 3.5 — last-write-wins já aceite para este volume de utilizadores).
    if (alvo.papel === Papel.admin_empresa && novoPapel !== Papel.admin_empresa) {
      const totalAdmins = await this.tenantPrisma.client.utilizador.count({
        where: { papel: Papel.admin_empresa, eliminadoEm: null },
      });
      if (totalAdmins <= 1) {
        throw new ConflictException('A Empresa tem de manter pelo menos um Administrador.');
      }
    }

    const papelAnterior = alvo.papel;
    const atualizado = await this.tenantPrisma.client.utilizador.update({
      where: { id: alvoId },
      data: { papel: novoPapel, atualizadoPor: ctx.utilizadorId },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'atribuir_papel',
      entidade: 'Utilizador',
      entidadeId: alvoId,
      detalhe: { papelAnterior, papelNovo: novoPapel },
    } satisfies EventoAuditoria);

    return atualizado;
  }

  /**
   * Atribuir/reatribuir/remover o Departamento de um Utilizador (RD-02,
   * RD-03; Especificação Técnica do Passo 8, 3.3) — ação exclusiva de
   * `admin_empresa` (D3 desse documento), verificada pelo `PermissaoGuard`
   * do controlador; aqui só a validação de instância de RD-03.
   */
  async atribuirDepartamento(alvoId: string, departamentoId: string | null) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    const alvo = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: alvoId } });
    if (!alvo) {
      throw new NotFoundException();
    }

    // RD-03 — o Departamento (quando não null) tem de existir, pertencer à
    // mesma Empresa (estrutural, Camada 1) e não estar eliminado.
    if (departamentoId !== null) {
      const departamento = await this.tenantPrisma.client.departamento.findUnique({ where: { id: departamentoId } });
      if (!departamento || departamento.eliminadoEm) {
        throw new NotFoundException('Departamento não encontrado.');
      }
    }

    const departamentoAnterior = alvo.departamentoId;
    const atualizado = await this.tenantPrisma.client.utilizador.update({
      where: { id: alvoId },
      data: { departamentoId, atualizadoPor: ctx.utilizadorId },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'atribuir_departamento',
      entidade: 'Utilizador',
      entidadeId: alvoId,
      detalhe: { departamentoAnterior, departamentoNovo: departamentoId },
    } satisfies EventoAuditoria);

    return atualizado;
  }
}
