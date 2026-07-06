import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export const TIPOS_INTERACAO = ['chamada', 'reuniao', 'nota', 'outro'] as const;
export type TipoInteracao = (typeof TIPOS_INTERACAO)[number];

export class CriarInteracaoDto {
  @IsIn(TIPOS_INTERACAO)
  tipo!: TipoInteracao;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsDateString()
  data?: string;
}
