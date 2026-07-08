import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from './session.guard';
import { PermissaoGuard } from '../autorizacao/permissao.guard';
import { RequirePermissao } from '../autorizacao/require-permissao.decorator';
import { UtilizadoresService } from './utilizadores.service';
import { AtribuirPapelDto } from './dto/atribuir-papel.dto';
import { AtribuirDepartamentoDto } from './dto/atribuir-departamento.dto';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';
import { SESSION_COOKIE_NAME } from './auth.constants';

/**
 * Endpoints de negócio dos Passos 5 (atribuir papel), 8 (atribuir
 * Departamento) e 27 (self-edit de perfil) — Blueprint §4; Especificações
 * Técnicas dos Passos 5 (3.5), 8 (3.1) e 27 (3.1).
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

  // Só SessionGuard (Especificação Técnica do Passo 27, Decisão B) — o alvo
  // é sempre ctx.utilizadorId, nunca um alvoId de outro Utilizador; RBAC por
  // papel não faz sentido para uma ação inteiramente self-scoped.
  @UseGuards(SessionGuard)
  @Patch('me')
  async atualizarPerfil(@Body() dto: AtualizarPerfilDto, @Req() req: Request) {
    const sessaoAtualId = req.cookies?.[SESSION_COOKIE_NAME] as string;
    return this.utilizadoresService.atualizarPerfil(dto, sessaoAtualId);
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
