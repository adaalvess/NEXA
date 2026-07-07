import { Plano } from '@prisma/client';

interface LimitesPlano {
  limiteUtilizadores: number | null;
  limiteArmazenamentoMb: number | null;
  limiteUsoIA: number | null;
}

/**
 * Configuração de código dos planos (Especificação Técnica do Passo 19,
 * 3.2) — valores aprovados pela Fundadora/CEO na aprovação do Milestone M4
 * (resolve o Risco R3 do Master Roadmap). `null` significa literalmente
 * "sem limite" (plano Enterprise) — nunca um valor sentinela.
 */
export const PLANOS_CONFIG: Record<Plano, LimitesPlano> = {
  starter: { limiteUtilizadores: 5, limiteArmazenamentoMb: 1024, limiteUsoIA: 50 },
  professional: { limiteUtilizadores: 20, limiteArmazenamentoMb: 10240, limiteUsoIA: 200 },
  enterprise: { limiteUtilizadores: null, limiteArmazenamentoMb: null, limiteUsoIA: null },
};
