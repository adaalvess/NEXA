import { IsDateString, IsIn, IsOptional, IsString, Length, ValidateIf } from 'class-validator';
import { ESTADOS_PROCESSO, EstadoProcesso } from './criar-processo.dto';

export class EditarProcessoDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  titulo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  responsavelId?: string;

  @IsOptional()
  @ValidateIf((o) => o.departamentoId !== null)
  @IsString()
  departamentoId?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.clienteId !== null)
  @IsString()
  clienteId?: string | null;

  @IsOptional()
  @IsIn(ESTADOS_PROCESSO)
  estado?: EstadoProcesso;

  @IsOptional()
  @ValidateIf((o) => o.prazo !== null)
  @IsDateString()
  prazo?: string | null;
}
