import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import { Papel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { tenantContext } from '../tenant/tenant-context';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../auditoria/eventos-auditoria';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';
import { PRIVILEGIO } from '../autorizacao/privilegio';

@Injectable()
export class UtilizadoresService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    // Bruto, exceção documentada (mesmo padrão de AuthService.registar) —
    // só para a transação multi-operação genuína de atualizarPerfil()
    // (Especificação Técnica do Passo 27, 3.1); scoping por empresaId feito
    // manualmente aqui, TenantPrismaService nunca é usado dentro dela.
    private readonly prisma: PrismaService,
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

  /**
   * Listagem reduzida de Utilizadores da Empresa (Especificação Técnica do
   * Passo 14, 3.2.1) — só para popular seletores de responsável/owner nos
   * formulários de Processos/CRM; nunca dados sensíveis (sem `email`).
   */
  async listar() {
    const utilizadores = await this.tenantPrisma.client.utilizador.findMany({
      where: { eliminadoEm: null },
      select: { id: true, nome: true, papel: true, departamentoId: true },
      orderBy: { nome: 'asc' },
    });
    return utilizadores;
  }

  /**
   * Self-edit de perfil (Especificação Técnica do Passo 27, 3.1) — o alvo é
   * sempre `ctx.utilizadorId`, nunca um `alvoId` (Decisão D1). Nunca
   * `email`/`papel` (Decisão C da Proposta do M5).
   *
   * Alteração de palavra-passe (Decisão A) invalida todas as outras sessões
   * ativas do Utilizador, mantendo só a que fez este pedido — feito na mesma
   * transação da atualização da password (pedido explícito da Fundadora/CEO:
   * nunca um estado onde a password muda mas as sessões antigas continuam
   * válidas, ou vice-versa, em caso de erro a meio).
   */
  async atualizarPerfil(dto: AtualizarPerfilDto, sessaoAtualId: string) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    if (dto.nome === undefined && dto.passwordNova === undefined) {
      throw new BadRequestException('Nada para atualizar.');
    }

    const utilizador = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: ctx.utilizadorId } });
    if (!utilizador) {
      throw new NotFoundException();
    }

    let novoPasswordHash: string | undefined;
    if (dto.passwordNova) {
      const passwordAtualValida = await argon2.verify(utilizador.passwordHash, dto.passwordAtual!).catch(() => false);
      if (!passwordAtualValida) {
        throw new UnauthorizedException('Palavra-passe atual incorreta.');
      }
      novoPasswordHash = await argon2.hash(dto.passwordNova, {
        type: argon2.argon2id,
        memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 19456),
        timeCost: Number(process.env.ARGON2_TIME_COST ?? 2),
      });
    }

    // Transação real via PrismaService bruto (nunca TenantPrismaService —
    // cada operação sua já corre na sua própria transação interna de
    // scoping, Especificação Técnica do Passo 4, 3.2.4, incompatível com uma
    // transação multi-operação genuína); scoping por empresaId feito
    // manualmente via a chave composta `id_empresaId` (ADR-003 §3.3).
    const atualizado = await this.prisma.$transaction(async (tx) => {
      const u = await tx.utilizador.update({
        where: { id_empresaId: { id: ctx.utilizadorId, empresaId: ctx.empresaId } },
        data: {
          nome: dto.nome,
          passwordHash: novoPasswordHash,
          atualizadoPor: ctx.utilizadorId,
        },
      });

      if (novoPasswordHash) {
        await tx.sessao.deleteMany({
          where: { utilizadorId: ctx.utilizadorId, empresaId: ctx.empresaId, id: { not: sessaoAtualId } },
        });
      }

      return u;
    });

    // Nunca a password (nem antiga nem nova, texto plano ou hash) em auditoria.
    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'atualizar_perfil',
      entidade: 'Utilizador',
      entidadeId: ctx.utilizadorId,
      detalhe: { nomeAlterado: dto.nome !== undefined, passwordAlterada: !!novoPasswordHash },
    } satisfies EventoAuditoria);

    return { utilizadorId: atualizado.id, nome: atualizado.nome };
  }
}
