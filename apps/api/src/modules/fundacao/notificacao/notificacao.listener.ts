import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../auditoria/eventos-auditoria';

/** Código Prisma de violação de chave estrangeira. */
const CODIGO_VIOLACAO_FK = 'P2003';

interface GatilhoNotificacao {
  tipoEvento: string;
  destinatarioId: string;
  entidadeOrigemId: string;
}

function extrairString(valor: unknown): string | undefined {
  return typeof valor === 'string' ? valor : undefined;
}

/**
 * Notification Dispatcher (FR-36; Especificação Técnica do Passo 11) —
 * segundo consumidor do mesmo `EVENTO_AUDITORIA` já emitido pelos Passos
 * 6/8/9/10, mas fire-and-forget (Event & Notification Architecture Rules,
 * 3.6), ao contrário do `AuditoriaListener` (obrigatório/bloqueante).
 *
 * A distinção não vem de um evento diferente — vem de `handle` nunca
 * retornar/aguardar a sua própria promessa: o `Promise.all` interno do
 * `emitAsync` (usado por quem emite) só espera pelo que cada listener
 * efetivamente retorna, por isso este consumidor nunca bloqueia a operação
 * de negócio original, mesmo estando registado no mesmo evento.
 *
 * `PrismaService` bruto (nunca `TenantPrismaService`) — mesmo padrão do
 * `AuditoriaListener`: `empresaId` já vem validado no payload do evento.
 *
 * Sem verificação de deduplicação adicional (3.3 da especificação) —
 * `EventEmitter2` não tem redelivery real, resolver esse risco agora seria
 * complexidade sem necessidade comprovada.
 *
 * Por ser fire-and-forget, esta escrita pode, em teoria, ainda estar em
 * curso depois de a Empresa referenciada ter sido eliminada (na aplicação
 * real isto exigiria um hard-delete concorrente, algo que o PSD-001 nem
 * decidiu ainda; em testes, é o cenário real encontrado — Especificação
 * Técnica do Passo 11, 3.7) — por isso `P2003` (violação de chave
 * estrangeira) é tratado como um desfecho legítimo e silencioso, nunca um
 * erro inesperado.
 */
@Injectable()
export class NotificacaoListener {
  private readonly logger = new Logger(NotificacaoListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(EVENTO_AUDITORIA)
  handle(payload: EventoAuditoria): void {
    void this.processar(payload).catch((erro) => {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === CODIGO_VIOLACAO_FK) {
        // A Empresa (ou o destinatário) já não existe quando esta escrita
        // tardia correu — desfecho legítimo de um consumidor fire-and-forget,
        // não um erro a investigar.
        this.logger.debug(`Notificação ignorada (${payload.acao}/${payload.entidade}) — entidade referenciada já não existe.`);
        return;
      }
      this.logger.error(`Falha ao processar notificação para ${payload.acao}/${payload.entidade}`, erro);
    });
  }

  private async processar(payload: EventoAuditoria): Promise<void> {
    const gatilho = this.resolverGatilho(payload);
    if (!gatilho) {
      return;
    }

    await this.prisma.notificacao.create({
      data: {
        empresaId: payload.empresaId,
        destinatarioId: gatilho.destinatarioId,
        tipoEvento: gatilho.tipoEvento,
        entidadeOrigemId: gatilho.entidadeOrigemId,
      },
    });
  }

  /** Conjunto mínimo de 5 gatilhos (Especificação Técnica do Passo 11, 3.2). */
  private resolverGatilho(payload: EventoAuditoria): GatilhoNotificacao | null {
    if (payload.acao === 'atribuir_papel' && payload.entidade === 'Utilizador') {
      return { tipoEvento: 'papel_alterado', destinatarioId: payload.entidadeId, entidadeOrigemId: payload.entidadeId };
    }

    if (payload.acao === 'atribuir_departamento' && payload.entidade === 'Utilizador') {
      return { tipoEvento: 'departamento_alterado', destinatarioId: payload.entidadeId, entidadeOrigemId: payload.entidadeId };
    }

    if (payload.acao === 'criar' && payload.entidade === 'Partilha') {
      const convidadoId = extrairString(payload.detalhe?.convidadoId);
      if (!convidadoId) {
        return null;
      }
      return { tipoEvento: 'partilha_concedida', destinatarioId: convidadoId, entidadeOrigemId: payload.entidadeId };
    }

    if (payload.acao === 'criar' && payload.entidade === 'Processo') {
      const dados = payload.detalhe?.dados as Record<string, unknown> | undefined;
      const responsavelId = extrairString(dados?.responsavelId);
      if (!responsavelId || responsavelId === payload.ator) {
        return null;
      }
      return { tipoEvento: 'tarefa_atribuida', destinatarioId: responsavelId, entidadeOrigemId: payload.entidadeId };
    }

    if (payload.acao === 'atualizar' && payload.entidade === 'Processo') {
      const alteracoes = payload.detalhe?.alteracoes as Record<string, { novo?: unknown }> | undefined;
      const responsavelId = extrairString(alteracoes?.responsavelId?.novo);
      if (!responsavelId) {
        return null;
      }
      return { tipoEvento: 'tarefa_reatribuida', destinatarioId: responsavelId, entidadeOrigemId: payload.entidadeId };
    }

    return null;
  }
}
