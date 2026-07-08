import { IsOptional, IsString, Length, MinLength, ValidateIf } from 'class-validator';

/**
 * Self-edit de perfil (Especificação Técnica do Passo 27, 3.1) — nunca
 * `email`/`papel` (Decisão C da Proposta do M5). `passwordAtual`/
 * `passwordNova` são sempre exigidas em conjunto — nunca uma mudança de
 * password sem confirmar a atual.
 */
export class AtualizarPerfilDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nome?: string;

  @ValidateIf((o: AtualizarPerfilDto) => o.passwordNova !== undefined)
  @IsString()
  passwordAtual?: string;

  @ValidateIf((o: AtualizarPerfilDto) => o.passwordAtual !== undefined)
  @IsString()
  @MinLength(8)
  passwordNova?: string;
}
