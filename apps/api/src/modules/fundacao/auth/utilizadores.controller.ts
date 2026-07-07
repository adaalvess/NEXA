import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { SessionGuard } from './session.guard';
import { PermissaoGuard } from '../autorizacao/permissao.guard';
import { RequirePermissao } from '../autorizacao/require-permissao.decorator';
import { UtilizadoresService } from './utilizadores.service';
import { AtribuirPapelDto } from './dto/atribuir-papel.dto';
import { AtribuirDepartamentoDto } from './dto/atribuir-departamento.dto';

/**
 * Endpoints de negócio dos Passos 5 (atribuir papel) e 8 (atribuir
 * Departamento) — Blueprint §4; Especificações Técnicas dos Passos 5 (3.5)
 * e 8 (3.1).
 */
@Controller('utilizadores')
export class UtilizadoresController {
  constructor(private readonly utilizadoresService: UtilizadoresService) {}

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'listar_utilizadores')
  @Get()
  async listar() {
    return this.utilizadoresService.listar();
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'atribuir_papel')
  @Patch(':id/papel')
  async atribuirPapel(@Param('id') id: string, @Body() dto: AtribuirPapelDto) {
    const utilizador = await this.utilizadoresService.atribuirPapel(id, dto.papel);
    return { utilizadorId: utilizador.id, papel: utilizador.papel };
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'atribuir_departamento')
  @Patch(':id/departamento')
  async atribuirDepartamento(@Param('id') id: string, @Body() dto: AtribuirDepartamentoDto) {
    const utilizador = await this.utilizadoresService.atribuirDepartamento(id, dto.departamentoId);
    return { utilizadorId: utilizador.id, departamentoId: utilizador.departamentoId };
  }
}
