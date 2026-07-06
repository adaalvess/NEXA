import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

/** Consulta do Registo de Auditoria confinada à própria Empresa (Admin da Empresa). */
@Injectable()
export class AuditoriaService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async listarDaEmpresa(take: number, skip: number) {
    return this.tenantPrisma.client.registoAuditoria.findMany({
      orderBy: { timestamp: 'desc' },
      take,
      skip,
    });
  }
}
