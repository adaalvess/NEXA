/**
 * Tipos partilhados que espelham exatamente os enums do backend
 * (`apps/api/prisma/schema.prisma`) — nunca redefinidos ad-hoc por ecrã.
 */
export type Papel = 'super_admin' | 'admin_empresa' | 'gestor' | 'colaborador' | 'convidado';

export type EstadoProcesso = 'por_fazer' | 'em_curso' | 'concluida';

export interface Processo {
  id: string;
  titulo: string;
  descricao: string | null;
  responsavelId: string;
  departamentoId: string | null;
  clienteId: string | null;
  estado: EstadoProcesso;
  prazo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Utilizador {
  id: string;
  nome: string;
  papel: Papel;
  departamentoId: string | null;
}

export interface Departamento {
  id: string;
  nome: string;
}

export type EstadoOportunidade = 'prospecao' | 'negociacao' | 'fechada_ganha' | 'fechada_perdida';

export interface Cliente {
  id: string;
  nome: string;
  tipo: 'empresa_cliente' | 'contacto_individual';
  contactoPrincipal: string | null;
  ownerId: string;
  estadoOportunidade: EstadoOportunidade | null;
}

export type TipoInteracao = 'chamada' | 'reuniao' | 'nota' | 'outro';

export interface Interacao {
  id: string;
  clienteId: string;
  tipo: TipoInteracao;
  descricao: string | null;
  data: string;
}

export type Pipeline = Record<EstadoOportunidade, Cliente[]>;

export type Plano = 'starter' | 'professional' | 'enterprise';

export type EstadoSubscricao = 'trial' | 'ativa' | 'limitada' | 'cancelada';

export interface PlanoConfig {
  plano: Plano;
  limiteUtilizadores: number | null;
  limiteArmazenamentoMb: number | null;
  limiteUsoIA: number | null;
}

/**
 * `GET /subscricao` (Especificação Técnica do Passo 23, 3.2) — todos os
 * valores derivados (`usoIAPercentagem`, `avisoLimiteIAProximo`,
 * `diasRestantesTrial`) já vêm calculados pelo backend; o frontend nunca
 * os recalcula.
 */
export interface ResumoSubscricao {
  plano: Plano;
  estado: EstadoSubscricao;
  estadoEfetivo: EstadoSubscricao;
  limiteUtilizadores: number | null;
  limiteArmazenamentoMb: number | null;
  limiteUsoIA: number | null;
  usoIAMensalAtual: number;
  usoIAPercentagem: number | null;
  avisoLimiteIAProximo: boolean;
  trialIniciadoEm: string | null;
  diasRestantesTrial: number | null;
}
