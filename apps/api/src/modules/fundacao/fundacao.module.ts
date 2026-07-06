import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { SessionGuard } from './auth/session.guard';

/**
 * Módulo Fundação (Blueprint EP-01) — Passo 3: Autenticação.
 * RBAC granular (Passo 5), Registo de Auditoria (Passo 6) e Partilha
 * (Passo 7) juntam-se a este módulo nos passos correspondentes.
 */
@Module({
  controllers: [AuthController],
  providers: [PrismaService, AuthService, SessionGuard],
})
export class FundacaoModule {}
