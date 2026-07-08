import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionGuard } from '../auth/session.guard';
import { PermissaoGuard } from '../autorizacao/permissao.guard';
import { RequirePermissao } from '../autorizacao/require-permissao.decorator';
import { ConviteService } from './convite.service';
import { CriarConviteDto } from './dto/criar-convite.dto';
import { AceitarConviteDto } from './dto/aceitar-convite.dto';

/**
 * `/convites` (UC-02; Especificação Técnica do Passo 30) — `criar` exige
 * sessão e a permissão `fundacao.convidar_utilizador`; `:token` e
 * `:token/aceitar` são públicos (a pessoa convidada ainda não tem conta).
 */
@Controller('convites')
export class ConviteController {
  constructor(private readonly conviteService: ConviteService) {}

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'convidar_utilizador')
  @Post()
  async criar(@Body() dto: CriarConviteDto) {
    return this.conviteService.criar(dto);
  }

  @Get(':token')
  async obterPorToken(@Param('token') token: string) {
    return this.conviteService.obterPorToken(token);
  }

  // Mesmo valor conservador de /auth/registar (Passo 3) — cria contas da
  // mesma forma.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':token/aceitar')
  async aceitar(@Param('token') token: string, @Body() dto: AceitarConviteDto) {
    return this.conviteService.aceitar(token, dto);
  }
}
