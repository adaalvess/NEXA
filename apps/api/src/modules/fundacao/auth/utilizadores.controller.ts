import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { SessionGuard } from './session.guard';
import { PermissaoGuard } from '../autorizacao/permissao.guard';
import { RequirePermissao } from '../autorizacao/require-permissao.decorator';
import { UtilizadoresService } from './utilizadores.service';
import { AtribuirPapelDto } from './dto/atribuir-papel.dto';

/**
 * Endpoint de negócio do Passo 5 (Blueprint §4; Especificação Técnica do
 * Passo 5, 3.5) — o único construído neste passo, suficiente para
 * demonstrar o DoD do M1 sem depender de email/limites de plano (2.1.B
 * desse documento).
 */
@Controller('utilizadores')
export class UtilizadoresController {
  constructor(private readonly utilizadoresService: UtilizadoresService) {}

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'atribuir_papel')
  @Patch(':id/papel')
  async atribuirPapel(@Param('id') id: string, @Body() dto: AtribuirPapelDto) {
    const utilizador = await this.utilizadoresService.atribuirPapel(id, dto.papel);
    return { utilizadorId: utilizador.id, papel: utilizador.papel };
  }
}
