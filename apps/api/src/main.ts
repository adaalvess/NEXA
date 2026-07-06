import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

/**
 * Ponto de entrada da API da NEXA.
 *
 * Nota de arquitetura (ADR-004): cookie-parser é necessário porque a
 * autenticação usa sessões do lado do servidor entregues via cookie
 * httpOnly/Secure/SameSite=Strict — nunca tokens no corpo/header geridos
 * pelo cliente.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Fronteira única de validação (Data & Consistency Rules, 3.6) — DTOs com
  // class-validator, aplicados globalmente via ValidationPipe.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS restrito ao frontend (Next.js) — a configurar com o domínio real
  // no ADR-007 (Vercel). Em desenvolvimento, aponta para localhost.
  app.enableCors({
    origin: process.env.WEB_APP_URL ?? 'http://localhost:3000',
    credentials: true, // obrigatório para cookies de sessão entre origens
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`NEXA API a correr em http://localhost:${port}`);
}

bootstrap();
