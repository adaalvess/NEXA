import { ConflictException, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import type { Sessao, Utilizador } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegistarDto } from './dto/registar.dto';
import { LoginDto } from './dto/login.dto';
import {
  DECOY_PASSWORD_HASH,
  LOGIN_ATTEMPT_CLEANUP_AGE_MS,
  LOGIN_LOCKOUT_TIERS,
  SESSION_DURATION_MS,
} from './auth.constants';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../auditoria/eventos-auditoria';
import { VERSAO_PRIVACIDADE, VERSAO_TERMOS } from './legal.constants';

/**
 * Autenticação (Passo 3, M1) — ver Especificação Técnica do Passo 3
 * (docs/04-implementation-blueprint/02-especificacao-tecnica-passo-3-autenticacao.md).
 *
 * Nota de arquitetura: este serviço acede ao PrismaService diretamente,
 * sem passar por uma Camada 1 de tenant/autorização — essa camada ainda não
 * existe (Passo 4). A verificação de email duplicado no registo é,
 * deliberadamente, global (não filtrada por tenant), consistente com UC-01
 * (Exceção E1).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async registar(dto: RegistarDto): Promise<{ empresaId: string; utilizadorId: string }> {
    const existente = await this.prisma.utilizador.findFirst({
      where: { email: dto.utilizador.email },
    });

    if (existente) {
      throw new ConflictException(
        'Este email já está associado a uma conta existente. Inicia sessão em vez de registar.',
      );
    }

    const passwordHash = await argon2.hash(dto.utilizador.password, {
      type: argon2.argon2id,
      memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 19456),
      timeCost: Number(process.env.ARGON2_TIME_COST ?? 2),
    });

    const { empresa, utilizador } = await this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          nome: dto.empresa.nome,
          pais: dto.empresa.pais,
          setor: dto.empresa.setor,
        },
      });

      // RN-01 (UC-01): toda Empresa nasce com exatamente um Administrador.
      // criadoPor/atualizadoPor ficam null — não existe ator autenticado
      // prévio neste bootstrap (Especificação Técnica do Passo 3, 3.3).
      const utilizador = await tx.utilizador.create({
        data: {
          empresaId: empresa.id,
          nome: dto.utilizador.nome,
          email: dto.utilizador.email,
          passwordHash,
          papel: 'admin_empresa',
        },
      });

      // RGPD (Especificação Técnica do Passo 47, Decisão A) — registo de
      // consentimento na mesma transação de bootstrap; `RegistarDto.aceiteTermos`
      // já garante estruturalmente que só chega aqui quando `true` literal.
      await tx.consentimentoRegisto.create({
        data: {
          empresaId: empresa.id,
          utilizadorId: utilizador.id,
          versaoTermos: VERSAO_TERMOS,
          versaoPrivacidade: VERSAO_PRIVACIDADE,
        },
      });

      return { empresa, utilizador };
    });

    // Registo de Auditoria (Especificação Técnica do Passo 6, 3.5) —
    // aguardado (emitAsync): etapa obrigatória, não fire-and-forget.
    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: empresa.id,
      ator: utilizador.id,
      acao: 'criar',
      entidade: 'Empresa',
      entidadeId: empresa.id,
      detalhe: { dados: { nome: empresa.nome, pais: empresa.pais, setor: empresa.setor } },
    } satisfies EventoAuditoria);

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: empresa.id,
      ator: utilizador.id,
      acao: 'criar',
      entidade: 'Utilizador',
      entidadeId: utilizador.id,
      detalhe: { dados: { nome: utilizador.nome, email: utilizador.email, papel: utilizador.papel } },
    } satisfies EventoAuditoria);

    return { empresaId: empresa.id, utilizadorId: utilizador.id };
  }

  /**
   * Verifica se a combinação IP+conta está atualmente bloqueada (Especificação
   * Técnica do Passo 39, 3.3/3.4) — cada camada usa a sua própria duração
   * como janela de contagem, por isso o bloqueio decai sozinho à medida que
   * tentativas antigas saem da janela dessa camada, sem precisar de guardar
   * um timestamp explícito de "fim do bloqueio".
   */
  private async estaBloqueado(email: string, ip: string): Promise<boolean> {
    for (const tier of LOGIN_LOCKOUT_TIERS) {
      const desde = new Date(Date.now() - tier.janelaMs);
      const total = await this.prisma.tentativaLoginFalhada.count({
        where: { email, ip, criadoEm: { gte: desde } },
      });
      if (total >= tier.minTentativas) {
        return true;
      }
    }
    return false;
  }

  async login(dto: LoginDto, ip: string): Promise<{ utilizador: Utilizador; sessao: Sessao }> {
    const email = dto.email.toLowerCase();

    // Rate limiting por IP+conta (ADR-007 §3.6) — verificado antes de
    // qualquer custo computacional de verificação de password. Se já estava
    // bloqueado por tentativas anteriores, nunca executa `argon2.verify`
    // aqui — nem por custo computacional, nem para não criar um oráculo de
    // temporização que distinguisse uma password certa de uma errada
    // enquanto já bloqueado — mas regista esta tentativa também, senão o
    // bloqueio nunca escalaria para a camada seguinte ("progressivo").
    if (await this.estaBloqueado(email, ip)) {
      await this.prisma.tentativaLoginFalhada.create({ data: { email, ip } });
      throw new HttpException('Demasiadas tentativas. Tenta novamente mais tarde.', 429);
    }

    const utilizador = await this.prisma.utilizador.findFirst({
      where: { email: dto.email },
    });

    // Mitigação de temporização (Especificação Técnica do Passo 3, 3.1.2/S3):
    // executa sempre um argon2.verify, mesmo quando o utilizador não existe,
    // contra um hash de referência fixo — nunca early-return sem custo
    // computacional equivalente.
    const hashParaVerificar = utilizador?.passwordHash ?? DECOY_PASSWORD_HASH;
    const passwordValida = await argon2.verify(hashParaVerificar, dto.password).catch(() => false);

    if (!utilizador || utilizador.eliminadoEm || !passwordValida) {
      // Regista a falha e faz limpeza oportunista de tentativas antigas
      // para esta combinação — evita depender do agendador do Render (só
      // chega no Passo 43+). Se esta falha, por si só, já atinge o limiar
      // da primeira camada, esta resposta já é o 429 (ADR-007: "5
      // tentativas... bloqueia" — a própria 5ª conta como bloqueada, não só
      // a 6ª em diante).
      await this.prisma.tentativaLoginFalhada.create({ data: { email, ip } });
      await this.prisma.tentativaLoginFalhada.deleteMany({
        where: { email, ip, criadoEm: { lt: new Date(Date.now() - LOGIN_ATTEMPT_CLEANUP_AGE_MS) } },
      });

      if (await this.estaBloqueado(email, ip)) {
        throw new HttpException('Demasiadas tentativas. Tenta novamente mais tarde.', 429);
      }

      // Mensagem genérica — nunca revela se o email existe (3.2.5).
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // Login bem-sucedido — reset do contador para esta combinação (3.3).
    await this.prisma.tentativaLoginFalhada.deleteMany({ where: { email, ip } });

    const sessao = await this.prisma.sessao.create({
      data: {
        empresaId: utilizador.empresaId,
        utilizadorId: utilizador.id,
        expiraEm: new Date(Date.now() + SESSION_DURATION_MS),
      },
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: utilizador.empresaId,
      ator: utilizador.id,
      acao: 'login',
      entidade: 'Sessao',
      entidadeId: sessao.id,
    } satisfies EventoAuditoria);

    return { utilizador, sessao };
  }

  /**
   * Invalida a Sessao no servidor (Especificação Técnica do Passo 14,
   * validação de logout) — nunca basta limpar o cookie no browser, já que um
   * cookie replay continuaria a autenticar enquanto a Sessao existisse na BD.
   */
  async logout(sessaoId: string, ctx: { utilizadorId: string; empresaId: string }): Promise<void> {
    await this.prisma.sessao.delete({ where: { id: sessaoId } });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'logout',
      entidade: 'Sessao',
      entidadeId: sessaoId,
    } satisfies EventoAuditoria);
  }
}
