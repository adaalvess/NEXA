import { IsString, Length } from 'class-validator';

export class EditarDepartamentoDto {
  @IsString()
  @Length(2, 100)
  nome!: string;
}
