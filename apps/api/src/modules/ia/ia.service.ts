import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Papel, Prisma } from '@prisma/client';
import { TenantPrismaService } from '../fundacao/prisma/tenant-prisma.service';
import { AuthorizationService } from '../fundacao/autorizacao/authorization.service';
import { tenantContext } from '../fundacao/tenant/tenant-context';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../fundacao/auditoria/eventos-auditoria';
import { ProcessosService } from '../processos/processos.service';
import { AiGatewayService } from './gateway/ai-gateway.service';

interface ConteudoSugestao {
  conteudoPergunta: string | null;
  conteudoResposta: string | null;
}

/** Único tipo de ação suportado no MVP (Especificação Técnica do Passo 17, Decisão A). */
interface AcaoReatribuirProcesso {
  tipo: 'reatribuir_processo';
  processoId: string;
  responsavelAtualId: string;
  responsavelSugeridoId: string;
}

interface SituacaoDetetada {
  processoId: string;
  titulo: string;
  responsavelAtualId: string;
  responsavelSugeridoId: string;
  nomeCandidato: string;
}

function reterConteudo(): boolean {
  return process.env.IA_RETER_CONTEUDO !== 'false';
}

function retencaoDias(): number {
  return Number(process.env.IA_RETENCAO_CONTEUDO_DIAS ?? 60);
}

/**
 * Módulo `ia` — pergunta livre (UC-05, FR-23/24; Especificação Técnica do
 * Passo 16) e sugestões de ação (UC-06, FR-25, RN-08; Especificação Técnica
 * do Passo 17). Reúne o resumo operacional/deteta situações já filtrados
 * por RBAC antes de invocar o `AiGatewayService` (Passo 15) — nunca o
 * Gateway decide sobre dados de domínio (ADR-005 §3.3 ponto 1).
 */
@Injectable()
export class IaService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly aiGateway: AiGatewayService,
    private readonly processosService: ProcessosService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async perguntar(pergunta: string): Promise<{ id: string; resposta: string }> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    const resumo = await this.reunirResumoOperacional();

    const resultado = await this.aiGateway.perguntar({
      sistema: resumo,
      mensagens: [{ papel: 'utilizador', conteudo: pergunta }],
    });

    const reter = reterConteudo();
    const sugestao = await this.tenantPrisma.client.sugestaoIA.create({
      data: {
        empresaId: ctx.empresaId,
        utilizadorId: ctx.utilizadorId,
        tipo: 'pergunta',
        estado: 'aceite', // D4 — pergunta nunca fica "pendente", só sugestão de ação (Passo 17)
        fornecedorUsado: resultado.fornecedorUsado,
        conteudoPergunta: reter ? pergunta : null,
        conteudoResposta: reter ? resultado.conteudo : null,
      },
    });

    return { id: sugestao.id, resposta: resultado.conteudo };
  }

  /**
   * Resumo operacional (Especificação Técnica do Passo 16, 3.3) — mesmos
   * agregados já computados pelo `DashboardService` (Passo 12), reunidos
   * de novo aqui via `AuthorizationService.construirFiltroWhere` (extraído
   * nesta especificação, 3.2) para nunca depender diretamente de outro
   * módulo de negócio (regra não-negociável #2). RN-07: dados fora do
   * escopo RBAC do Utilizador nunca são reunidos, logo nunca chegam ao
   * Gateway nem ao fornecedor.
   */
  async reunirResumoOperacional(): Promise<string> {
    const escopoProcesso = await this.authorizationService.obterEscopoVisibilidade('processo');
    const filtroProcesso = this.authorizationService.construirFiltroWhere(escopoProcesso, 'departamentoId', 'responsavelId');
    const whereProcesso = { eliminadoEm: null, ...filtroProcesso };

    const escopoCliente = await this.authorizationService.obterEscopoVisibilidade('cliente');
    const filtroCliente = this.authorizationService.construirFiltroWhere(escopoCliente, 'departamentoId', 'ownerId', {
      departamentoViaRelacao: 'owner',
    });
    const whereCliente = { eliminadoEm: null, ...filtroCliente };

    const [total, porFazer, emCurso, concluida, emAtraso, processosEmAtraso, totalClientes, comOportunidadeAtiva, prospecao, negociacao, fechadaGanha, fechadaPerdida] =
      await Promise.all([
        this.tenantPrisma.client.processo.count({ where: whereProcesso }),
        this.tenantPrisma.client.processo.count({ where: { ...whereProcesso, estado: 'por_fazer' } }),
        this.tenantPrisma.client.processo.count({ where: { ...whereProcesso, estado: 'em_curso' } }),
        this.tenantPrisma.client.processo.count({ where: { ...whereProcesso, estado: 'concluida' } }),
        this.tenantPrisma.client.processo.count({
          where: { ...whereProcesso, estado: { not: 'concluida' }, prazo: { lt: new Date() } },
        }),
        this.tenantPrisma.client.processo.findMany({
          where: { ...whereProcesso, estado: { not: 'concluida' }, prazo: { lt: new Date() } },
          select: { titulo: true },
          take: 10,
        }),
        this.tenantPrisma.client.cliente.count({ where: whereCliente }),
        this.tenantPrisma.client.cliente.count({ where: { ...whereCliente, estadoOportunidade: { in: ['prospecao', 'negociacao'] } } }),
        this.tenantPrisma.client.cliente.count({ where: { ...whereCliente, estadoOportunidade: 'prospecao' } }),
        this.tenantPrisma.client.cliente.count({ where: { ...whereCliente, estadoOportunidade: 'negociacao' } }),
        this.tenantPrisma.client.cliente.count({ where: { ...whereCliente, estadoOportunidade: 'fechada_ganha' } }),
        this.tenantPrisma.client.cliente.count({ where: { ...whereCliente, estadoOportunidade: 'fechada_perdida' } }),
      ]);

    const linhas = [
      `Processos: ${total} no total — ${porFazer} por fazer, ${emCurso} em curso, ${concluida} concluída, ${emAtraso} em atraso.`,
      processosEmAtraso.length > 0 ? `Processos em atraso: ${processosEmAtraso.map((p) => p.titulo).join('; ')}.` : '',
      `Clientes: ${totalClientes} no total — ${comOportunidadeAtiva} com oportunidade ativa.`,
      `Pipeline: ${prospecao} em prospeção, ${negociacao} em negociação, ${fechadaGanha} fechada-ganha, ${fechadaPerdida} fechada-perdida.`,
    ].filter(Boolean);

    return [
      'És o Assistente de IA da NEXA. Responde só com base no resumo operacional abaixo, que já está filtrado ao âmbito do Utilizador que pergunta — nunca inventes dados fora dele.',
      ...linhas,
    ].join('\n');
  }

  /**
   * Ocultação de conteúdo na leitura (PSD-003; Especificação Técnica do
   * Passo 16, 3.1/Decisão a Validar B) — sem endpoint de leitura ainda
   * neste passo (só `POST /ia/perguntar`, que devolve sempre conteúdo
   * fresco), mas construído e testado diretamente já agora para os Passos
   * 17/18 reutilizarem sem repetir esta regra.
   */
  aplicarRetencao(sugestao: { createdAt: Date; conteudoPergunta: string | null; conteudoResposta: string | null }): ConteudoSugestao {
    const diasDesde = (Date.now() - sugestao.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diasDesde > retencaoDias()) {
      return { conteudoPergunta: null, conteudoResposta: null };
    }
    return { conteudoPergunta: sugestao.conteudoPergunta, conteudoResposta: sugestao.conteudoResposta };
  }

  /**
   * Geração de sugestões de ação (UC-06, FR-25; Especificação Técnica do
   * Passo 17, 3.3). Deteção e texto 100% determinísticos (Decisão B) —
   * nenhuma chamada ao AI Gateway, para preservar a quota escassa. Cria uma
   * `SugestaoIA` `pendente` por situação detetada; idempotente (3.2) — uma
   * situação já coberta por uma sugestão pendente nunca gera duplicado.
   */
  async gerarSugestoes(): Promise<{ sugestoes: { id: string; entidadeRef: string; texto: string }[] }> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    const situacoes = await this.detetarProcessosEmRisco();

    const criadas: { id: string; entidadeRef: string; texto: string }[] = [];
    for (const situacao of situacoes) {
      const texto = `Processo '${situacao.titulo}' está atrasado. Sugerimos reatribuir a ${situacao.nomeCandidato}, que tem atualmente menos Processos em atraso no Departamento.`;
      const acaoPayload: AcaoReatribuirProcesso = {
        tipo: 'reatribuir_processo',
        processoId: situacao.processoId,
        responsavelAtualId: situacao.responsavelAtualId,
        responsavelSugeridoId: situacao.responsavelSugeridoId,
      };

      const sugestao = await this.tenantPrisma.client.sugestaoIA.create({
        data: {
          empresaId: ctx.empresaId,
          utilizadorId: ctx.utilizadorId,
          tipo: 'sugestao_acao',
          entidadeRef: situacao.processoId,
          fornecedorUsado: 'deterministico',
          conteudoResposta: texto,
          // `AcaoReatribuirProcesso` não é estruturalmente igual ao tipo
          // recursivo `InputJsonValue` do Prisma — cast seguro, o valor real
          // é sempre JSON serializável (mesmo padrão de AuditoriaListener).
          acaoPayload: acaoPayload as unknown as Prisma.InputJsonValue,
        },
      });

      criadas.push({ id: sugestao.id, entidadeRef: situacao.processoId, texto });
    }

    if (criadas.length > 0) {
      await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
        empresaId: ctx.empresaId,
        ator: ctx.utilizadorId,
        acao: 'gerar',
        entidade: 'SugestaoIA',
        entidadeId: criadas[0].id,
        detalhe: { quantidade: criadas.length, ids: criadas.map((c) => c.id) },
      } satisfies EventoAuditoria);
    }

    return { sugestoes: criadas };
  }

  /**
   * Confirmação de uma sugestão de ação (UC-06, RN-08; Especificação
   * Técnica do Passo 17, 3.4/Decisão C). Executa via `ProcessosService.editar`
   * — nunca escreve diretamente no Processo — herdando PR-01 a PR-07, a
   * autorização de instância e o evento de auditoria já emitidos por
   * Processos (evento distinto do `confirmar`/`SugestaoIA` abaixo, Event &
   * Notification Architecture Rules §3.8).
   */
  async confirmarSugestao(id: string): Promise<{ id: string; estado: string }> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    const sugestao = await this.tenantPrisma.client.sugestaoIA.findUnique({ where: { id } });
    if (!sugestao) {
      throw new NotFoundException();
    }

    if (sugestao.utilizadorId !== ctx.utilizadorId && ctx.papel !== Papel.admin_empresa) {
      throw new ForbiddenException();
    }

    if (sugestao.tipo !== 'sugestao_acao') {
      throw new BadRequestException('Este endpoint só confirma sugestões de ação.');
    }

    if (sugestao.estado !== 'pendente') {
      throw new ConflictException('Esta sugestão já foi confirmada ou rejeitada.');
    }

    const acao = sugestao.acaoPayload as unknown as AcaoReatribuirProcesso;

    // Decisão E — revalida a situação antes de executar (UC-06, Exceção
    // E1): se já não for válida, devolve 409 sem tocar em `estado`, para o
    // Utilizador poder rejeitar explicitamente.
    const processoAtual = await this.tenantPrisma.client.processo.findUnique({ where: { id: acao.processoId } });
    const aindaValida =
      processoAtual &&
      !processoAtual.eliminadoEm &&
      processoAtual.estado !== 'concluida' &&
      processoAtual.responsavelId === acao.responsavelAtualId;

    if (!aindaValida) {
      throw new ConflictException('A ação sugerida já não é válida.');
    }

    await this.processosService.editar(acao.processoId, { responsavelId: acao.responsavelSugeridoId });

    const atualizada = await this.tenantPrisma.client.sugestaoIA.update({ where: { id }, data: { estado: 'aceite' } });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'confirmar',
      entidade: 'SugestaoIA',
      entidadeId: id,
      detalhe: { processoId: acao.processoId, responsavelSugeridoId: acao.responsavelSugeridoId },
    } satisfies EventoAuditoria);

    return { id: atualizada.id, estado: atualizada.estado };
  }

  /** Rejeição de uma sugestão de ação (UC-06; Especificação Técnica do Passo 17, 3.5) — nunca toca no Processo. */
  async rejeitarSugestao(id: string): Promise<{ id: string; estado: string }> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    const sugestao = await this.tenantPrisma.client.sugestaoIA.findUnique({ where: { id } });
    if (!sugestao) {
      throw new NotFoundException();
    }

    if (sugestao.utilizadorId !== ctx.utilizadorId && ctx.papel !== Papel.admin_empresa) {
      throw new ForbiddenException();
    }

    if (sugestao.tipo !== 'sugestao_acao') {
      throw new BadRequestException('Este endpoint só rejeita sugestões de ação.');
    }

    if (sugestao.estado !== 'pendente') {
      throw new ConflictException('Esta sugestão já foi confirmada ou rejeitada.');
    }

    const atualizada = await this.tenantPrisma.client.sugestaoIA.update({ where: { id }, data: { estado: 'rejeitada' } });

    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId: ctx.empresaId,
      ator: ctx.utilizadorId,
      acao: 'rejeitar',
      entidade: 'SugestaoIA',
      entidadeId: id,
    } satisfies EventoAuditoria);

    return { id: atualizada.id, estado: atualizada.estado };
  }

  /**
   * Listagem de sugestões pendentes (Especificação Técnica do Passo 18,
   * 3.1/Decisões a Validar A/B) — sempre `tipo='sugestao_acao'` e
   * `estado='pendente'` (a área é literalmente "Sugestões Pendentes",
   * Information Architecture §3.1, sem parâmetro de filtro). Visibilidade:
   * mesma regra de autoridade já usada em confirmar/rejeitar (Passo 17) —
   * `admin_empresa` vê todas as da Empresa, qualquer outro só as que gerou.
   * Reaproveita `aplicarRetencao` sobre `conteudoResposta`, mesma disciplina
   * já aplicada a perguntas (Passo 16).
   */
  async listarSugestoesPendentes(): Promise<{ id: string; entidadeRef: string | null; texto: string | null; createdAt: Date }[]> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    const sugestoes = await this.tenantPrisma.client.sugestaoIA.findMany({
      where: {
        tipo: 'sugestao_acao',
        estado: 'pendente',
        utilizadorId: ctx.papel === Papel.admin_empresa ? undefined : ctx.utilizadorId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sugestoes.map((s) => ({
      id: s.id,
      entidadeRef: s.entidadeRef,
      texto: this.aplicarRetencao(s).conteudoResposta,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Deteção determinística de Processos em risco (Especificação Técnica do
   * Passo 17, 3.2) — reaproveita `obterEscopoVisibilidade`/`construirFiltroWhere`
   * (Passo 16), a mesma condição de "atraso" já usada em
   * `reunirResumoOperacional`. Único candidato considerado: um Colaborador
   * do mesmo Departamento, diferente do responsável atual, com menos
   * Processos em atraso atualmente atribuídos (empate desfeito por `id`
   * ascendente, para resultado estável em teste).
   */
  private async detetarProcessosEmRisco(): Promise<SituacaoDetetada[]> {
    const escopo = await this.authorizationService.obterEscopoVisibilidade('processo');
    const filtro = this.authorizationService.construirFiltroWhere(escopo, 'departamentoId', 'responsavelId');
    const where = { eliminadoEm: null, estado: { not: 'concluida' as const }, prazo: { lt: new Date() }, ...filtro };

    const processosEmRisco = await this.tenantPrisma.client.processo.findMany({
      where,
      select: { id: true, titulo: true, responsavelId: true, departamentoId: true },
    });

    const situacoes: SituacaoDetetada[] = [];

    for (const processo of processosEmRisco) {
      if (!processo.departamentoId) {
        continue; // sem Departamento, não há como identificar um candidato de reatribuição.
      }

      const jaPendente = await this.tenantPrisma.client.sugestaoIA.findFirst({
        where: { tipo: 'sugestao_acao', entidadeRef: processo.id, estado: 'pendente' },
      });
      if (jaPendente) {
        continue; // idempotência — não duplica uma sugestão já pendente para o mesmo Processo.
      }

      const candidatos = await this.tenantPrisma.client.utilizador.findMany({
        where: { departamentoId: processo.departamentoId, papel: Papel.colaborador, eliminadoEm: null, id: { not: processo.responsavelId } },
        orderBy: { id: 'asc' },
        select: { id: true, nome: true },
      });
      if (candidatos.length === 0) {
        continue; // sem candidato válido, não há ação a propor.
      }

      let melhor: { id: string; nome: string } | null = null;
      let melhorContagem = Infinity;
      for (const candidato of candidatos) {
        const contagem = await this.tenantPrisma.client.processo.count({
          where: { responsavelId: candidato.id, eliminadoEm: null, estado: { not: 'concluida' }, prazo: { lt: new Date() } },
        });
        if (contagem < melhorContagem) {
          melhor = candidato;
          melhorContagem = contagem;
        }
      }

      if (!melhor) {
        continue;
      }

      situacoes.push({
        processoId: processo.id,
        titulo: processo.titulo,
        responsavelAtualId: processo.responsavelId,
        responsavelSugeridoId: melhor.id,
        nomeCandidato: melhor.nome,
      });
    }

    return situacoes;
  }
}
