import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Papel } from '@prisma/client';
import { SessionGuard } from '../auth/session.guard';
import { PermissaoGuard } from '../autorizacao/permissao.guard';
import { RequirePermissao } from '../autorizacao/require-permissao.decorator';
import { tenantContext } from '../tenant/tenant-context';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaInternaService } from './auditoria-interna.service';
import { EVENTO_AUDITORIA, EventoAuditoria } from './eventos-auditoria';

const TAKE_DEFAULT = 50;

/**
 * `GET /auditoria` (Blueprint §4, FR-07; Especificação Técnica do Passo 6,
 * 3.6) — uma única rota, comportamento ramifica por papel: `admin_empresa`
 * só a sua Empresa; `super_admin` todas as Empresas (via
 * `AuditoriaInternaService`, role só-leitura dedicado); os restantes, `403`
 * (negado pelo `PermissaoGuard` de base).
 */
@Controller('auditoria')
export class AuditoriaController {
  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly auditoriaInternaService: AuditoriaInternaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @UseGuards(SessionGuard, PermissaoGuard)
  @RequirePermissao('fundacao', 'consultar_auditoria')
  @Get()
  async listar(@Query('take') take?: string, @Query('skip') skip?: string) {
    const ctx = tenantContext.getStore();
    const takeNum = take ? Number(take) : TAKE_DEFAULT;
    const skipNum = skip ? Number(skip) : 0;

    if (ctx?.papel === Papel.super_admin) {
      const registos = await this.auditoriaInternaService.listarTodas(takeNum, skipNum);

      // A própria consulta cross-tenant é auditada (Especificação Técnica do
      // Passo 6, 3.6/D5) — na Empresa do próprio Super Admin, pelo mecanismo
      // normal (nunca pelo role só-leitura, que nunca escreve).
      await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
        empresaId: ctx.empresaId,
        ator: ctx.utilizadorId,
        acao: 'consultar_auditoria_interna',
        entidade: 'RegistoAuditoria',
        entidadeId: 'todas',
        detalhe: { empresasConsultadas: 'todas' },
      } satisfies EventoAuditoria);

      return registos;
    }

    return this.auditoriaService.listarDaEmpresa(takeNum, skipNum);
  }
}
