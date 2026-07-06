import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../fundacao/auth/session.guard';
import { PermissaoGuard } from '../fundacao/autorizacao/permissao.guard';
import { RequirePermissao } from '../fundacao/autorizacao/require-permissao.decorator';
import { DashboardService } from './dashboard.service';

const TAKE_DEFAULT = 50;

/**
 * `/dashboard` e `/notificacoes` (Blueprint §4, FR-11 a FR-13, FR-36;
 * Especificação Técnica do Passo 12) — tudo pessoal, escopo já resolvido
 * por `obterEscopoVisibilidade`/`destinatarioId`, sem restrição adicional
 * por papel na matriz (3.5 da especificação).
 */
@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('dashboard', 'ver')
  @Get('dashboard')
  async obterDashboard() {
    return this.dashboardService.obterDashboard();
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('dashboard', 'ver')
  @Get('notificacoes')
  async listarNotificacoes(@Query('take') take?: string, @Query('skip') skip?: string, @Query('lida') lida?: string) {
    const lidaFiltro = lida === undefined ? undefined : lida === 'true';
    return this.dashboardService.listarNotificacoes(take ? Number(take) : TAKE_DEFAULT, skip ? Number(skip) : 0, lidaFiltro);
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('dashboard', 'marcar_lida')
  @Patch('notificacoes/:id/lida')
  async marcarComoLida(@Param('id') id: string) {
    return this.dashboardService.marcarComoLida(id);
  }
}
