import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegistarDto } from './dto/registar.dto';
import { LoginDto } from './dto/login.dto';
import { SessionGuard } from './session.guard';
import { TenantContextValue } from '../tenant/tenant-context';
import { SESSION_COOKIE_NAME } from './auth.constants';

/**
 * Endpoints de Autenticação (Blueprint §4; Especificação Técnica do Passo 3).
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Proteção contra spam de registo (3.2.4) — modelo de ameaça diferente do
  // login (nenhuma conta existe ainda para combinar com o IP), mantido
  // inalterado pela correção do Passo 39 (Especificação Técnica do Passo 39,
  // 3.5).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('registar')
  async registar(@Body() dto: RegistarDto) {
    return this.authService.registar(dto);
  }

  // Rate limiting por IP+conta, aplicado dentro de AuthService.login
  // (ADR-007 §3.6; Especificação Técnica do Passo 39) — substitui o
  // @Throttle genérico anterior, que não suportava a chave IP+conta, a
  // contagem só de falhas, nem o bloqueio progressivo exigidos pelo ADR-007.
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { utilizador, sessao } = await this.authService.login(dto, req.ip ?? '');

    res.cookie(SESSION_COOKIE_NAME, sessao.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      expires: sessao.expiraEm,
    });

    return {
      utilizadorId: utilizador.id,
      empresaId: utilizador.empresaId,
      nome: utilizador.nome,
      papel: utilizador.papel,
    };
  }

  // Endpoint de verificação técnica (Especificação Técnica do Passo 3, 3.1.3
  // e Q4) — não é endpoint de produto, só demonstra o SessionGuard end-to-end.
  @UseGuards(SessionGuard)
  @Get('eu')
  async eu(@Req() req: Request & { utilizador?: TenantContextValue }) {
    return req.utilizador;
  }

  // Adicionado na validação da Sub-entrega 1 do Passo 14 — lacuna real do
  // Passo 3 (só registo/login/verificação existiam, nunca logout).
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(
    @Req() req: Request & { utilizador?: TenantContextValue },
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessaoId: string | undefined = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessaoId && req.utilizador) {
      await this.authService.logout(sessaoId, req.utilizador);
    }
    res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
    return { ok: true };
  }
}
