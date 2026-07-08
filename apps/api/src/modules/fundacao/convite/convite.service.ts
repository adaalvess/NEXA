import * as crypto from 'crypto';
import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import { Papel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { tenantContext } from '../tenant/tenant-context';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../auditoria/eventos-auditoria';
import { PRIVILEGIO } from '../autorizacao/privilegio';
import { EMAIL_ADAPTER } from '../email/adapters/email-adapter.interface';
import type { EmailAdapterInterface } from '../email/adapters/email-adapter.interface';
import { CriarConviteDto } from './dto/criar-convite.dto';
import { AceitarConviteDto } from './dto/aceitar-convite.dto';

const EXPIRACAO_CONVITE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias (Especificação Técnica do Passo 29, Decisão A).

/**
 * UC-02 (Especificação Técnica do Passo 30) — envio e aceitação de convites.
 * Reutiliza integralmente a infraestrutura do Passo 29 (`EMAIL_ADAPTER`,
 * `ConviteUtilizador`) e as regras de autoridade já fixadas no Passo 5
 * (`PRIVILEGIO`, RN-03/RN-04) — nunca uma segunda definição.
 */
@Injectable()
export class ConviteService {
  private readonly logger = new Logger(ConviteService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    // Bruto, exceção documentada — `obterPorToken`/`aceitar` correm sem
    // sessão (endpoints públicos, sem TenantContext); `criar` usa-o só para
    // a verificação global de email (CV-05, mesmo padrão de AuthService.registar).
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(EMAIL_ADAPTER) private readonly emailAdapter: EmailAdapterInterface,
  ) {}

  /**
   * CV-01 a CV-06 (Especificação Técnica do Passo 30, 3.1). Ordem
   * "enviar antes de persistir" (3.1, mesma secção) — se o envio falhar,
   * nenhum `ConviteUtilizador` fica em estado pendente órfão.
   *
   * Nota sobre o cenário inverso, levantado pela Fundadora/CEO na aprovação:
   * não existe forma de garantir atomicidade real entre dois sistemas
   * externos distintos (o fornecedor de email e a base de dados) sem um
   * padrão de duas fases desproporcionado para esta funcionalidade. Se o
   * envio for bem-sucedido mas a persistência falhar a seguir (falha
   * transitória de BD, o único cenário plausível — CV-05/CV-06 já foram
   * verificados antes do envio), o resultado é um link já entregue que não
   * corresponde a nenhum convite real: falha segura (`404` em
   * `obterPorToken`/`aceitar`, nunca acesso indevido), nunca um estado
   * inconsistente na BD. Este cenário é registado com `Logger.error`
   * (inclui o `token` e o `email`, nunca a password) para permitir
   * seguimento operacional manual, e devolvido ao Administrador como `500`
   * explícito — nunca um `201` que esconderia a falha.
   */
  async criar(dto: CriarConviteDto) {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    const papelAtor = ctx.papel as Exclude<Papel, 'super_admin'>;

    // CV-01 — nunca convidar com papel de privilégio maior do que o do ator.
    if (PRIVILEGIO[dto.papelPretendido] < PRIVILEGIO[papelAtor]) {
      throw new ForbiddenException('Não é permitido convidar com um papel de privilégio maior do que o teu.');
    }

    let departamentoPretendidoId = dto.departamentoPretendidoId ?? null;

    // CV-03 — RN-03: Gestor só convida dentro do seu próprio Departamento/Equipa.
    if (ctx.papel === Papel.gestor) {
      const gestor = await this.tenantPrisma.client.utilizador.findUnique({ where: { id: ctx.utilizadorId } });
      if (!gestor?.departamentoId) {
        throw new ForbiddenException('Só podes convidar se pertenceres a um Departamento/Equipa.');
      }
      if (departamentoPretendidoId && departamentoPretendidoId !== gestor.departamentoId) {
        throw new ForbiddenException('Só podes convidar dentro do teu próprio Departamento/Equipa.');
      }
      departamentoPretendidoId = gestor.departamentoId;
    }

    // CV-04 — RD-03: o Departamento (quando fornecido) tem de existir,
    // pertencer à mesma Empresa (estrutural, Camada 1) e não estar eliminado.
    if (departamentoPretendidoId) {
      const departamento = await this.tenantPrisma.client.departamento.findUnique({ where: { id: departamentoPretendidoId } });
      if (!departamento || departamento.eliminadoEm) {
        throw new NotFoundException('Departamento não encontrado.');
      }
    }

    // CV-05 — unicidade global de email (Decisão C, mesmo padrão de
    // AuthService.registar/UC-01 E1) — nunca filtrado por tenant aqui.
    const utilizadorExistente = await this.prisma.utilizador.findFirst({ where: { email: dto.email } });
    if (utilizadorExistente) {
      throw new ConflictException('Este email já está associado a uma conta existente.');
    }

    // CV-06 — não pode já existir um convite pendente e não expirado para o
    // mesmo email, nesta Empresa.
    const conviteExistente = await this.tenantPrisma.client.conviteUtilizador.findFirst({
      where: { email: dto.email, estado: 'pendente', expiraEm: { gt: new Date() } },
    });
    if (conviteExistente) {
      throw new ConflictException('Já existe um convite pendente para este email.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const empresa = await this.tenantPrisma.client.empresa.findUnique({ where: { id: ctx.empresaId } });
    const linkConvite = `${process.env.WEB_APP_URL}/convites/${token}`;

    const resultadoEnvio = await this.emailAdapter.enviar({
      destinatario: dto.email,
      assunto: `Foste convidado para te juntares a ${empresa?.nome} na NEXA`,
      corpoHtml: `<p>Foste convidado para te juntares a <strong>${empresa?.nome}</strong> na NEXA.</p><p><a href="${linkConvite}">Aceitar convite</a></p><p>Este convite expira em 7 dias.</p>`,
    });

    if (!resultadoEnvio.enviado) {
      throw new BadGatewayException('Não foi possível enviar o email de convite. Tenta novamente.');
    }

    let convite;
    try {
      convite = await this.tenantPrisma.client.conviteUtilizador.create({
        data: {
          email: dto.email,
          papelPretendido: dto.papelPretendido as Papel,
          departamentoPretendidoId,
          token,
          convidadoPorId: ctx.utilizadorId,
          expiraEm: new Date(Date.now() + EXPIRACAO_CONVITE_MS),
        } as never,
      });
    } catch (erro) {
      // Ver nota acima — email já entregue, persistência falhou. Falha
      // segura (o link não corresponde a nada), mas nunca escondida do
      // Administrador nem dos logs operacionais.
      this.logger.error(
        `Email de convite enviado mas a persistência falhou (email: ${dto.email}, token gerado mas não guardado).`,
        erro instanceof Error ? erro.stack : undefined,
      );
      throw new InternalServerErrorException('O email de convite foi enviado, mas ocorreu um erro ao guardar o convite. Tenta novamente.');
    }

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'criar',
      entidade: 'ConviteUtilizador',
      entidadeId: convite.id,
      detalhe: { email: dto.email, papelPretendido: dto.papelPretendido, departamentoPretendidoId },
    } satisfies EventoAuditoria);

    return {
      id: convite.id,
      email: convite.email,
      papelPretendido: convite.papelPretendido,
      departamentoPretendidoId: convite.departamentoPretendidoId,
      estado: convite.estado,
      expiraEm: convite.expiraEm,
    };
  }

  /**
   * Pré-visualização pública do convite (Especificação Técnica do Passo 30,
   * 3.2, Decisão A) — nunca expõe `token` nem dados de outro Utilizador.
   */
  async obterPorToken(token: string) {
    const convite = await this.prisma.conviteUtilizador.findUnique({ where: { token } });
    if (!convite) {
      throw new NotFoundException();
    }

    const empresa = await this.prisma.empresa.findUnique({ where: { id: convite.empresaId } });

    return {
      empresaNome: empresa?.nome,
      email: convite.email,
      papelPretendido: convite.papelPretendido,
      estado: convite.estado,
      expirado: convite.expiraEm.getTime() < Date.now(),
    };
  }

  /**
   * Aceitação pública (Especificação Técnica do Passo 30, 3.3) — sem
   * auto-login aqui (Decisão de desenho, 3.3): o Passo 31 encadeia
   * `POST /auth/login` no frontend, mesmo padrão já aprovado no Passo 26.
   */
  async aceitar(token: string, dto: AceitarConviteDto) {
    const convite = await this.prisma.conviteUtilizador.findUnique({ where: { token } });
    if (!convite) {
      throw new NotFoundException();
    }

    if (convite.estado !== 'pendente') {
      throw new ConflictException('Este convite já foi utilizado ou revogado.');
    }
    if (convite.expiraEm.getTime() < Date.now()) {
      throw new ConflictException('Este convite expirou.');
    }

    // CV-05 revalidado — o email pode ter passado a corresponder a uma
    // conta entre o envio e a aceitação.
    const utilizadorExistente = await this.prisma.utilizador.findFirst({ where: { email: convite.email } });
    if (utilizadorExistente) {
      throw new ConflictException('Este email já está associado a uma conta existente. Inicia sessão em vez de aceitar este convite.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 19456),
      timeCost: Number(process.env.ARGON2_TIME_COST ?? 2),
    });

    const { utilizador } = await this.prisma.$transaction(async (tx) => {
      const utilizador = await tx.utilizador.create({
        data: {
          empresaId: convite.empresaId,
          nome: dto.nome,
          email: convite.email,
          passwordHash,
          papel: convite.papelPretendido,
          departamentoId: convite.departamentoPretendidoId,
          criadoPor: convite.convidadoPorId,
        },
      });

      await tx.conviteUtilizador.update({
        where: { id: convite.id },
        data: { estado: 'aceite' },
      });

      return { utilizador };
    });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: convite.empresaId,
      ator: utilizador.id,
      acao: 'aceitar',
      entidade: 'ConviteUtilizador',
      entidadeId: convite.id,
      detalhe: { utilizadorId: utilizador.id },
    } satisfies EventoAuditoria);

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: convite.empresaId,
      ator: utilizador.id,
      acao: 'criar',
      entidade: 'Utilizador',
      entidadeId: utilizador.id,
      detalhe: { dados: { nome: utilizador.nome, email: utilizador.email, papel: utilizador.papel } },
    } satisfies EventoAuditoria);

    return { empresaId: convite.empresaId, utilizadorId: utilizador.id };
  }
}
