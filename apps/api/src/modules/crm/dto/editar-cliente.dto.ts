import { IsIn, IsOptional, IsString, Length, ValidateIf } from 'class-validator';
import { ESTADOS_OPORTUNIDADE, EstadoOportunidade, TIPOS_CLIENTE, TipoCliente } from './criar-cliente.dto';

export class EditarClienteDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  nome?: string;

  @IsOptional()
  @IsIn(TIPOS_CLIENTE)
  tipo?: TipoCliente;

  @IsOptional()
  @IsString()
  contactoPrincipal?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @ValidateIf((o) => o.estadoOportunidade !== null)
  @IsIn(ESTADOS_OPORTUNIDADE)
  estadoOportunidade?: EstadoOportunidade | null;
}
