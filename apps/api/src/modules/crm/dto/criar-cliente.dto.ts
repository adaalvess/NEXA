import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export const TIPOS_CLIENTE = ['empresa_cliente', 'contacto_individual'] as const;
export type TipoCliente = (typeof TIPOS_CLIENTE)[number];

export const ESTADOS_OPORTUNIDADE = ['prospecao', 'negociacao', 'fechada_ganha', 'fechada_perdida'] as const;
export type EstadoOportunidade = (typeof ESTADOS_OPORTUNIDADE)[number];

export class CriarClienteDto {
  @IsString()
  @Length(2, 150)
  nome!: string;

  @IsIn(TIPOS_CLIENTE)
  tipo!: TipoCliente;

  @IsOptional()
  @IsString()
  contactoPrincipal?: string;

  @IsString()
  ownerId!: string;

  @IsOptional()
  @IsIn(ESTADOS_OPORTUNIDADE)
  estadoOportunidade?: EstadoOportunidade;
}
