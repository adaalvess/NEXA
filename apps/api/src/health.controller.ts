import { Controller, Get } from '@nestjs/common';

/**
 * Endpoint de verificação de disponibilidade — usado pela monitorização
 * de uptime (ADR-007, 3.4) e pelo processo de deployment (ADR-007, 3.9)
 * para confirmar que a aplicação arrancou corretamente.
 *
 * Não exige autenticação — não expõe nenhum dado sensível.
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'nexa-api', timestamp: new Date().toISOString() };
  }

  // TEMPORÁRIO — validação real de captura de erros da Sentry (Passo 43).
  // Removido no commit seguinte, imediatamente após a confirmação.
  @Get('erro-teste-sentry-passo-43')
  erroTesteSentry() {
    throw new Error('Erro deliberado — validação real do Passo 43 (Sentry, M7)');
  }
}
