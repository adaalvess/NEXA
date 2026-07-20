import { Type } from 'class-transformer';
import { Equals, IsEmail, IsOptional, IsString, Length, MinLength, ValidateNested } from 'class-validator';

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

  // RGPD (Especificação Técnica do Passo 47, Decisão D) — enforcement
  // estrutural, nunca só visual: o backend rejeita (400) qualquer registo
  // sem consentimento explícito, mesmo contornando a UI diretamente via API.
  // `@Equals(true)` (não `@IsBoolean()`) porque `false`/ausente têm de falhar
  // a validação da mesma forma — só `true` literal é aceite.
  @Equals(true, { message: 'É necessário aceitar os Termos de Serviço e a Política de Privacidade.' })
  aceiteTermos!: true;
}
