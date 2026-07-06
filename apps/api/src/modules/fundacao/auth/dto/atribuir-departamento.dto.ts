import { IsString, ValidateIf } from 'class-validator';

/**
 * `departamentoId: null` remove a atribuição (RD-02, Especificação Técnica
 * do Passo 8, 3.3) — por isso o campo é sempre exigido no corpo do pedido
 * (nunca omitido), mas aceita `null` como valor explícito válido.
 */
export class AtribuirDepartamentoDto {
  @ValidateIf((o) => o.departamentoId !== null)
  @IsString()
  departamentoId!: string | null;
}
