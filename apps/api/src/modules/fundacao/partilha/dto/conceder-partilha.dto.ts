import { IsIn, IsString } from 'class-validator';

/** As duas únicas entidades partilháveis no MVP (PRD 3.3; Data Model Conceptual 3.3). */
export const ENTIDADES_PARTILHAVEIS = ['cliente', 'processo'] as const;
export type EntidadePartilhavel = (typeof ENTIDADES_PARTILHAVEIS)[number];

/**
 * `nivelAcesso` nunca está aqui — o serviço fixa sempre `leitura`, único
 * valor possível no MVP (mesmo padrão de `PAPEIS_ATRIBUIVEIS` fixar a
 * fronteira de valores aceites, Especificação Técnica do Passo 5).
 */
export class ConcederPartilhaDto {
  @IsIn(ENTIDADES_PARTILHAVEIS)
  entidadeTipo!: EntidadePartilhavel;

  @IsString()
  entidadeId!: string;

  @IsString()
  convidadoId!: string;
}
