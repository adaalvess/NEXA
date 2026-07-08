import { IsString, Length, MinLength } from 'class-validator';

export class AceitarConviteDto {
  @IsString()
  @Length(2, 100)
  nome!: string;

  // NFR-08 — mesma política mínima de robustez de password do registo.
  @IsString()
  @MinLength(8)
  password!: string;
}
