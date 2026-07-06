import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegistarDto } from './dto/registar.dto';
import { LoginDto } from './dto/login.dto';
import { SessionGuard, UtilizadorAutenticado } from './session.guard';
import { SESSION_COOKIE_NAME } from './auth.constants';

/**
 * Endpoints de Autenticação (Blueprint §4; Especificação Técnica do Passo 3).
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Proteção conservadora contra brute force (3.2.4) — valores provisórios,
  // a rever no ADR-007 (Q1 da Especificação Técnica do Passo 3).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('registar')
  async registar(@Body() dto: RegistarDto) {
    return this.authService.registar(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { utilizador, sessao } = await this.authService.login(dto);

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
  async eu(@Req() req: Request & { utilizador?: UtilizadorAutenticado }) {
    return req.utilizador;
  }
}
