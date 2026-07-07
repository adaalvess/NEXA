import { IsString, Length } from 'class-validator';

export class PerguntarDto {
  @IsString()
  @Length(1, 2000)
  pergunta!: string;
}
