import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../fundacao/auth/session.guard';
import { PermissaoGuard } from '../fundacao/autorizacao/permissao.guard';
import { RequirePermissao } from '../fundacao/autorizacao/require-permissao.decorator';
import { BloqueadoPorSubscricao } from '../comercial/bloqueado-por-subscricao.decorator';
import { CriarProcessoDto } from './dto/criar-processo.dto';
import { EditarProcessoDto } from './dto/editar-processo.dto';
import { ProcessosService } from './processos.service';

const TAKE_DEFAULT = 50;

/**
 * `/processos` (Blueprint §4, FR-14 a FR-18; Especificação Técnica do
 * Passo 9, 3.7) — primeiro módulo de negócio fora da Fundação. `ver: true`
 * é o gate estático para todos os papéis; o âmbito real vem de
 * `AuthorizationService.obterEscopoVisibilidade`/`podeAgirSobreEntidade`,
 * nunca só do guard (mesmo padrão de `listar_partilhas`, Passo 7).
 */
@Controller('processos')
export class ProcessosController {
  constructor(private readonly processosService: ProcessosService) {}

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('processos', 'criar')
  @BloqueadoPorSubscricao()
  @Post()
  async criar(@Body() dto: CriarProcessoDto) {
    return this.processosService.criar(dto);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('processos', 'ver')
  @Get()
  async listar(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.processosService.listar(take ? Number(take) : TAKE_DEFAULT, skip ? Number(skip) : 0);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('processos', 'ver')
  @Get(':id')
  async obter(@Param('id') id: string) {
    return this.processosService.obter(id);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('processos', 'editar')
  @Patch(':id')
  async editar(@Param('id') id: string, @Body() dto: EditarProcessoDto) {
    return this.processosService.editar(id, dto);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('processos', 'eliminar')
  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    return this.processosService.eliminar(id);
  }
}
