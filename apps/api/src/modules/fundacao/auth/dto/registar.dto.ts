import { Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, MinLength, ValidateNested } from 'class-validator';

/**
 * Validação de campos (fronteira única, Data & Consistency Rules 3.6):
 * limites conforme Functional Specifications, 3.1.
 */
class EmpresaRegistoDto {
  @IsString()
  @Length(2, 100)
  nome!: string;

  @IsString()
  pais!: string;

  @IsOptional()
  @IsString()
  setor?: string;
}

class UtilizadorRegistoDto {
  @IsString()
  @Length(2, 100)
  nome!: string;

  @IsEmail()
  email!: string;

  // NFR-08 — política mínima de robustez de password.
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RegistarDto {
  @ValidateNested()
  @Type(() => EmpresaRegistoDto)
  empresa!: EmpresaRegistoDto;

  @ValidateNested()
  @Type(() => UtilizadorRegistoDto)
  utilizador!: UtilizadorRegistoDto;
}
