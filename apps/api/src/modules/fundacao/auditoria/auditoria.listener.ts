import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EVENTO_AUDITORIA, EventoAuditoria } from './eventos-auditoria';

/**
 * Único ponto de escrita do Registo de Auditoria (Especificação Técnica do
 * Passo 6, 3.2). Usa `PrismaService` bruto (exceção transversal da Fundação
 * já documentada nos Passos 3/4) — nunca `TenantPrismaService`: o
 * `empresaId` já vem validado no payload do evento por quem o emitiu (sob a
 * Camada 1 correta na origem), o que também resolve o caso de bootstrap
 * (registo de Empresa, sem `TenantContext` ainda).
 *
 * Chamado sempre via `emitAsync` pelos serviços de negócio — é uma etapa
 * obrigatória e bloqueante da operação, não um efeito secundário
 * fire-and-forget (Data & Consistency Rules, 3.1 — auditoria é "Forte").
 */
@Injectable()
export class AuditoriaListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(EVENTO_AUDITORIA)
  async aoRegistarEvento(payload: EventoAuditoria): Promise<void> {
    await this.prisma.registoAuditoria.create({
      data: {
        empresaId: payload.empresaId,
        ator: payload.ator,
        acao: payload.acao,
        entidade: payload.entidade,
        entidadeId: payload.entidadeId,
        // `Record<string, unknown>` não é estruturalmente igual ao tipo
        // recursivo `InputJsonValue` do Prisma — cast seguro, o valor real é
        // sempre JSON serializável (garantido pela interface EventoAuditoria).
        detalhe: payload.detalhe as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
