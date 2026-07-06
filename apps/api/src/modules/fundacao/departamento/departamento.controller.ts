import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { PermissaoGuard } from '../autorizacao/permissao.guard';
import { RequirePermissao } from '../autorizacao/require-permissao.decorator';
import { CriarDepartamentoDto } from './dto/criar-departamento.dto';
import { EditarDepartamentoDto } from './dto/editar-departamento.dto';
import { DepartamentoService } from './departamento.service';

/**
 * `/departamentos` (Blueprint §4, FR-05; Especificação Técnica do Passo 8) —
 * API plana, `empresaId` sempre implícito via Camada 1 (mesmo padrão do
 * Passo 5 para `/utilizadores/:id/papel`).
 */
@Controller('departamentos')
export class DepartamentoController {
  constructor(private readonly departamentoService: DepartamentoService) {}

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'criar_departamento')
  @Post()
  async criar(@Body() dto: CriarDepartamentoDto) {
    return this.departamentoService.criar(dto.nome);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'listar_departamentos')
  @Get()
  async listar() {
    return this.departamentoService.listar();
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'editar_departamento')
  @Patch(':id')
  async editar(@Param('id') id: string, @Body() dto: EditarDepartamentoDto) {
    return this.departamentoService.editar(id, dto.nome);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'eliminar_departamento')
  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    return this.departamentoService.eliminar(id);
  }
}
