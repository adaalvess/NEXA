import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Plano } from '@prisma/client';
import { SessionGuard } from '../fundacao/auth/session.guard';
import { PermissaoGuard } from '../fundacao/autorizacao/permissao.guard';
import { RequirePermissao } from '../fundacao/autorizacao/require-permissao.decorator';
import { PLANOS_CONFIG } from './planos-config';
import { SubscricaoService } from './subscricao.service';
import { CriarCheckoutDto } from './dto/criar-checkout.dto';

/**
 * `/planos` e `/subscricao/checkout` (Especificações Técnicas dos Passos
 * 19 e 21). `POST /subscricao/checkout` nunca leva `@BloqueadoPorSubscricao()`
 * (Especificação Técnica do Passo 21, Decisão F) — é precisamente a via de
 * escape de uma Empresa em acesso limitado (RN-11, Passo 20).
 */
@Controller()
export class ComercialController {
  constructor(private readonly subscricaoService: SubscricaoService) {}

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('comercial', 'ver_planos')
  @Get('planos')
  async listarPlanos() {
    return (Object.keys(PLANOS_CONFIG) as Plano[]).map((plano) => ({ plano, ...PLANOS_CONFIG[plano] }));
  }

  // Sem sessão nem permissão (Especificação Técnica do Passo 24, 3.1) —
  // reaproveita `listarPlanos()` literalmente, nunca duplica a leitura de
  // `PLANOS_CONFIG`; resposta byte-idêntica à de `GET /planos`, só sem
  // exigir sessão. Consumido pela página pública `/precos` (Passo 24).
  @Get('planos/publico')
  async listarPlanosPublico() {
    return this.listarPlanos();
  }

  // Reutiliza `comercial.ver_planos` (Especificação Técnica do Passo 23,
  // Decisão A) — ver o resumo da própria subscrição é a mesma capacidade
  // de "ver planos", nunca uma permissão nova.
  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('comercial', 'ver_planos')
  @Get('subscricao')
  async obterSubscricao() {
    return this.subscricaoService.obterResumoSubscricao();
  }

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('comercial', 'iniciar_checkout')
  @Post('subscricao/checkout')
  async criarCheckout(@Body() dto: CriarCheckoutDto) {
    return this.subscricaoService.criarCheckout(dto.plano);
  }
}
