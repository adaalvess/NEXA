import { SetMetadata } from '@nestjs/common';

export const BLOQUEADO_POR_SUBSCRICAO_KEY = 'bloqueadoPorSubscricao';

/**
 * Marca um endpoint de criação de conteúdo de negócio como sujeito a RN-11
 * (Especificação Técnica do Passo 20, 3.2/3.4) — verificado pelo
 * `SubscricaoGuard`, global. Ausência deste decorator significa "permitido",
 * nunca "negado" — assimetria deliberada face a `@RequirePermissao`
 * (Passo 5), onde a ausência de metadata nega por defeito: RN-11 é uma
 * restrição estreita e específica, não a regra geral de acesso.
 */
export const BloqueadoPorSubscricao = () => SetMetadata(BLOQUEADO_POR_SUBSCRICAO_KEY, true);
