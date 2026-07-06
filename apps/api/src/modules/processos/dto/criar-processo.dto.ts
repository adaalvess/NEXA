import { IsDateString, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

export const ESTADOS_PROCESSO = ['por_fazer', 'em_curso', 'concluida'] as const;
export type EstadoProcesso = (typeof ESTADOS_PROCESSO)[number];

export class CriarProcessoDto {
  @IsString()
  @Length(2, 200)
  titulo!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsString()
  responsavelId!: string;

  @IsOptional()
  @ValidateIf((o) => o.departamentoId !== null)
  @IsString()
  departamentoId?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.clienteId !== null)
  @IsString()
  clienteId?: string | null;

  @IsOptional()
  @IsDateString()
  prazo?: string;
}
