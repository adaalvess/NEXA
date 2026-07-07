import { Body, Controller, Post, UseFilters, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../fundacao/auth/session.guard';
import { PermissaoGuard } from '../fundacao/autorizacao/permissao.guard';
import { RequirePermissao } from '../fundacao/autorizacao/require-permissao.decorator';
import { IaService } from './ia.service';
import { PerguntarDto } from './dto/perguntar.dto';
import { IaExceptionFilter } from './ia-exception.filter';

/**
 * `/ia` (Especificação Técnica do Passo 16) — primeiro endpoint de produto
 * do M3. `convidado` nunca tem `ia.perguntar` (Information Architecture
 * §3.4, "Não aplicável").
 */
@Controller('ia')
@UseFilters(IaExceptionFilter)
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('ia', 'perguntar')
  @Post('perguntar')
  async perguntar(@Body() dto: PerguntarDto) {
    return this.iaService.perguntar(dto.pergunta);
  }
}
