import { IsString, Length } from 'class-validator';

export class CriarDepartamentoDto {
  @IsString()
  @Length(2, 100)
  nome!: string;
}
