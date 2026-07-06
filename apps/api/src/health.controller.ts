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
}
