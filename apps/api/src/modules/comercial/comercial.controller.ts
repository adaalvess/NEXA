import { Controller, Get, UseGuards } from '@nestjs/common';
import { Plano } from '@prisma/client';
import { SessionGuard } from '../fundacao/auth/session.guard';
import { PermissaoGuard } from '../fundacao/autorizacao/permissao.guard';
import { RequirePermissao } from '../fundacao/autorizacao/require-permissao.decorator';
import { PLANOS_CONFIG } from './planos-config';

/**
 * `/planos` (Especificação Técnica do Passo 19, 3.5) — lista estática dos
 * planos disponíveis (UC-07, passo 2 do fluxo principal), nunca o estado da
 * subscrição da Empresa que pergunta.
 */
@Controller()
export class ComercialController {
  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('comercial', 'ver_planos')
  @Get('planos')
  async listarPlanos() {
    return (Object.keys(PLANOS_CONFIG) as Plano[]).map((plano) => ({ plano, ...PLANOS_CONFIG[plano] }));
  }
}
