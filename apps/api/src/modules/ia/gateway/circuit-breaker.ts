import { Injectable } from '@nestjs/common';

// Lidas a cada chamada, nunca cacheadas a nível de módulo — mesma razão de
// `quota.service.ts` (testabilidade sem depender da ordem de importação).
function limiarFalhas(): number {
  return Number(process.env.IA_CIRCUIT_BREAKER_LIMIAR ?? 5);
}
function janelaMs(): number {
  return Number(process.env.IA_CIRCUIT_BREAKER_JANELA_MS ?? 60_000);
}
function duracaoAbertoMs(): number {
  return Number(process.env.IA_CIRCUIT_BREAKER_DURACAO_MS ?? 120_000);
}

type EstadoCircuito = 'fechado' | 'aberto' | 'meio_aberto';

interface EstadoFornecedor {
  estado: EstadoCircuito;
  falhasRecentes: number[]; // timestamps (ms) das falhas dentro da janela
  abertoDesde?: number;
}

/**
 * Circuit breaker por fornecedor (ADR-005 §3.8; Especificação Técnica do
 * Passo 15, 3.6) — em memória do processo, suficiente para um único
 * processo/monólito modular (regra não-negociável #1); não requer
 * coordenação distribuída nesta fase.
 */
@Injectable()
export class CircuitBreakerService {
  private readonly estados = new Map<string, EstadoFornecedor>();

  private obterOuCriar(fornecedor: string): EstadoFornecedor {
    let estado = this.estados.get(fornecedor);
    if (!estado) {
      estado = { estado: 'fechado', falhasRecentes: [] };
      this.estados.set(fornecedor, estado);
    }
    return estado;
  }

  /** `true` = recusar a chamada imediatamente, sem sequer tentar o fornecedor. */
  estaAberto(fornecedor: string): boolean {
    const estado = this.obterOuCriar(fornecedor);

    if (estado.estado === 'aberto' && estado.abertoDesde !== undefined) {
      if (Date.now() - estado.abertoDesde >= duracaoAbertoMs()) {
        estado.estado = 'meio_aberto';
        return false; // deixa passar 1 pedido de teste
      }
      return true;
    }

    return false;
  }

  registarSucesso(fornecedor: string): void {
    const estado = this.obterOuCriar(fornecedor);
    estado.estado = 'fechado';
    estado.falhasRecentes = [];
    estado.abertoDesde = undefined;
  }

  registarFalha(fornecedor: string): void {
    const estado = this.obterOuCriar(fornecedor);
    const agora = Date.now();

    if (estado.estado === 'meio_aberto') {
      // O pedido de teste falhou — volta a abrir imediatamente.
      estado.estado = 'aberto';
      estado.abertoDesde = agora;
      estado.falhasRecentes = [agora];
      return;
    }

    estado.falhasRecentes = [...estado.falhasRecentes, agora].filter((t) => agora - t <= janelaMs());

    if (estado.falhasRecentes.length >= limiarFalhas()) {
      estado.estado = 'aberto';
      estado.abertoDesde = agora;
    }
  }
}
