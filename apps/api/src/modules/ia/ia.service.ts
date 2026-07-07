import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TenantPrismaService } from '../fundacao/prisma/tenant-prisma.service';
import { AuthorizationService } from '../fundacao/autorizacao/authorization.service';
import { tenantContext } from '../fundacao/tenant/tenant-context';
import { AiGatewayService } from './gateway/ai-gateway.service';

interface ConteudoSugestao {
  conteudoPergunta: string | null;
  conteudoResposta: string | null;
}

function reterConteudo(): boolean {
  return process.env.IA_RETER_CONTEUDO !== 'false';
}

function retencaoDias(): number {
  return Number(process.env.IA_RETENCAO_CONTEUDO_DIAS ?? 60);
}

/**
 * Módulo `ia` — pergunta livre (UC-05, FR-23/24; Especificação Técnica do
 * Passo 16). Reúne o resumo operacional já filtrado por RBAC (3.3 dessa
 * especificação) antes de invocar o `AiGatewayService` (Passo 15) — nunca
 * o Gateway decide sobre dados de domínio (ADR-005 §3.3 ponto 1).
 */
@Injectable()
export class IaService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly aiGateway: AiGatewayService,
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
}
