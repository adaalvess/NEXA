import { Papel } from '@prisma/client';

/**
 * Hierarquia de privilégio dentro de uma Empresa (Especificação Técnica do
 * Passo 5, 3.4, L2) — número menor = mais privilegiado. `super_admin` fica
 * fora desta hierarquia: nunca atribuível por ninguém dentro de uma Empresa
 * cliente (RN-04), por isso não tem entrada aqui — qualquer tentativa de o
 * atribuir/convidar já foi rejeitada na fronteira única (DTO) antes de
 * chegar a este ponto.
 *
 * Extraída para aqui no Passo 30 (Especificação Técnica do Passo 30, 3.1,
 * CV-01) — reutilizada por `UtilizadoresService.atribuirPapel` (Passo 5) e
 * por `ConviteService.criar` (Passo 30), evitando uma segunda definição da
 * mesma hierarquia (Regra não-negociável #4, configuração sobre hardcoding
 * disperso).
 */
export const PRIVILEGIO: Record<Exclude<Papel, 'super_admin'>, number> = {
  [Papel.admin_empresa]: 1,
  [Papel.gestor]: 2,
  [Papel.colaborador]: 3,
  [Papel.convidado]: 4,
};
