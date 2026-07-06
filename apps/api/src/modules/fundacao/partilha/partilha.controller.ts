import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { PermissaoGuard } from '../autorizacao/permissao.guard';
import { RequirePermissao } from '../autorizacao/require-permissao.decorator';
import { ConcederPartilhaDto } from './dto/conceder-partilha.dto';
import { PartilhaService } from './partilha.service';

const TAKE_DEFAULT = 50;

/**
 * `/partilhas` (Blueprint §4, FR-35; Especificação Técnica do Passo 7, 3.6)
 * — capacidade transversal da Fundação (System Design Principles, regra
 * #2), não de um módulo de negócio ainda inexistente (Processos, CRM). O
 * `PermissaoGuard` verifica só a permissão de papel; a autoridade de
 * instância (P1-P3) é decidida em `PartilhaService`.
 */
@Controller('partilhas')
export class PartilhaController {
  constructor(private readonly partilhaService: PartilhaService) {}

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'conceder_partilha')
  @Post()
  async conceder(@Body() dto: ConcederPartilhaDto) {
    const partilha = await this.partilhaService.conceder(dto.entidadeTipo, dto.entidadeId, dto.convidadoId);
    return { id: partilha.id, entidadeTipo: partilha.entidadeTipo, entidadeId: partilha.entidadeId, convidadoId: partilha.convidadoId };
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'revogar_partilha')
  @Delete(':id')
  async revogar(@Param('id') id: string) {
    const partilha = await this.partilhaService.revogar(id);
    return { id: partilha.id, revogadoEm: partilha.revogadoEm };
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'listar_partilhas')
  @Get()
  async listar(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.partilhaService.listar(take ? Number(take) : TAKE_DEFAULT, skip ? Number(skip) : 0);
  }
}
