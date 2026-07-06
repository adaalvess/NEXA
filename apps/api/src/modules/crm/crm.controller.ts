import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../fundacao/auth/session.guard';
import { PermissaoGuard } from '../fundacao/autorizacao/permissao.guard';
import { RequirePermissao } from '../fundacao/autorizacao/require-permissao.decorator';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { EditarClienteDto } from './dto/editar-cliente.dto';
import { CriarInteracaoDto } from './dto/criar-interacao.dto';
import { CrmService } from './crm.service';

const TAKE_DEFAULT = 50;

/**
 * `/clientes` e `/pipeline` (Blueprint §4, FR-19 a FR-22; Especificação
 * Técnica do Passo 10, 3.6) — segundo módulo de negócio, reutiliza
 * integralmente a visibilidade centralizada do `AuthorizationService`
 * (Passo 9). Sem `DELETE /clientes/:id` neste passo (2.1.D da especificação).
 */
@Controller()
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('crm', 'criar')
  @Post('clientes')
  async criarCliente(@Body() dto: CriarClienteDto) {
    return this.crmService.criarCliente(dto);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('crm', 'ver')
  @Get('clientes')
  async listarClientes(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.crmService.listarClientes(take ? Number(take) : TAKE_DEFAULT, skip ? Number(skip) : 0);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('crm', 'ver')
  @Get('clientes/:id')
  async obterCliente(@Param('id') id: string) {
    return this.crmService.obterCliente(id);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('crm', 'editar')
  @Patch('clientes/:id')
  async editarCliente(@Param('id') id: string, @Body() dto: EditarClienteDto) {
    return this.crmService.editarCliente(id, dto);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('crm', 'editar')
  @Post('clientes/:id/interacoes')
  async criarInteracao(@Param('id') id: string, @Body() dto: CriarInteracaoDto) {
    return this.crmService.criarInteracao(id, dto);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('crm', 'ver')
  @Get('clientes/:id/interacoes')
  async listarInteracoes(@Param('id') id: string) {
    return this.crmService.listarInteracoes(id);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('crm', 'ver_pipeline')
  @Get('pipeline')
  async pipeline() {
    return this.crmService.pipeline();
  }
}
