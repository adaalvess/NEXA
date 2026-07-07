import { Body, Controller, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../fundacao/auth/session.guard';
import { PermissaoGuard } from '../fundacao/autorizacao/permissao.guard';
import { RequirePermissao } from '../fundacao/autorizacao/require-permissao.decorator';
import { IaService } from './ia.service';
import { PerguntarDto } from './dto/perguntar.dto';
import { IaExceptionFilter } from './ia-exception.filter';

/**
 * `/ia` (Especificações Técnicas dos Passos 16 e 17). `convidado` nunca tem
 * acesso a nenhuma ação deste controlador (Information Architecture §3.4,
 * "Não aplicável"); `colaborador` tem `ia.perguntar` mas nunca as ações de
 * sugestão (Especificação Técnica do Passo 17, Decisão D — estruturalmente
 * incapaz de reatribuir Processos a terceiros).
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

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('ia', 'gerar_sugestoes')
  @Post('sugestoes')
  async gerarSugestoes() {
    return this.iaService.gerarSugestoes();
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('ia', 'confirmar_sugestao')
  @Post('sugestoes/:id/confirmar')
  async confirmarSugestao(@Param('id') id: string) {
    return this.iaService.confirmarSugestao(id);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('ia', 'rejeitar_sugestao')
  @Post('sugestoes/:id/rejeitar')
  async rejeitarSugestao(@Param('id') id: string) {
    return this.iaService.rejeitarSugestao(id);
  }
}
