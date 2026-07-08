import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { PAPEIS_ATRIBUIVEIS, PapelAtribuivel } from '../../auth/dto/atribuir-papel.dto';

/**
 * `papelPretendido` reaproveita literalmente `PAPEIS_ATRIBUIVEIS` (Passo 5)
 * — nunca `super_admin` (CV-02/RN-04), validado aqui, na fronteira única
 * (Especificação Técnica do Passo 30, 3.1).
 */
export class CriarConviteDto {
  @IsEmail()
  email!: string;

  @IsIn(PAPEIS_ATRIBUIVEIS)
  papelPretendido!: PapelAtribuivel;

  @IsOptional()
  @IsString()
  departamentoPretendidoId?: string;
}
