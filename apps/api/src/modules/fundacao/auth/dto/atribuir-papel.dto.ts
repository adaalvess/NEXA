import { IsIn } from 'class-validator';

/** Nunca `super_admin` — validado aqui, na fronteira única (L4/RN-04, Especificação Técnica do Passo 5, 3.4). */
export const PAPEIS_ATRIBUIVEIS = ['admin_empresa', 'gestor', 'colaborador', 'convidado'] as const;
export type PapelAtribuivel = (typeof PAPEIS_ATRIBUIVEIS)[number];

export class AtribuirPapelDto {
  @IsIn(PAPEIS_ATRIBUIVEIS)
  papel!: PapelAtribuivel;
}
