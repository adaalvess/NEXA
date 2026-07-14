import './instrument';

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
 *
 * `rawBody: true` (Especificação Técnica do Passo 22, 3.2/Decisão B) —
 * preserva `req.rawBody` em paralelo ao corpo já interpretado como JSON,
 * exigido pela verificação de assinatura de webhooks Stripe (a assinatura é
 * calculada sobre os bytes exatos do pedido, nunca sobre o corpo já
 * interpretado) — não afeta o parsing de nenhuma outra rota.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Confia no primeiro hop de proxy (Render fica sempre atrás de um load
  // balancer, ADR-007 §3.2) — sem isto, `req.ip` veria sempre o IP interno
  // do proxy, colapsando o rate limiting por IP+conta (Especificação Técnica
  // do Passo 39, 3.3) para todos os clientes na mesma chave.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

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
