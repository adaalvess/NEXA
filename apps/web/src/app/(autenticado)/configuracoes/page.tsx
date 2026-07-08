'use client';

import { useSessao } from '../../../lib/sessao-context';
import { SeccaoPerfil } from './SeccaoPerfil';
import { SeccaoUtilizadores } from './SeccaoUtilizadores';
import { SeccaoDepartamentos } from './SeccaoDepartamentos';

/**
 * Ecrã "Configurações" (Especificação Técnica do Passo 28) — fecha o Bloco
 * B do M5. Página única com 3 secções empilhadas (Decisão A) — mesmo
 * padrão de `/subscricao` (Passo 23), sem separadores/sub-rotas nesta
 * fase. Cada secção é um componente independente (pedido explícito da
 * Fundadora/CEO na aprovação) — facilita uma futura evolução para
 * separadores/sub-rotas sem reescrever a página.
 *
 * Item "Configurações" visível a todos os papéis (Decisão B) — todos têm
 * de conseguir gerir o próprio Perfil; "Utilizadores/Permissões" e
 * "Departamentos" só aparecem consoante o `papel`, mas isto é só
 * apresentação — a autorização real continua sempre garantida pelo
 * backend (ADR-006 §3.7), nunca por esta condição.
 */
export default function PaginaConfiguracoes() {
  const { papel } = useSessao();

  const podeVerUtilizadores = papel === 'admin_empresa' || papel === 'gestor';
  const podeVerDepartamentos = papel === 'admin_empresa';

  return (
    <div className="space-y-8 p-8">
      <h1 className="font-display text-h1 text-nexa-white">Configurações</h1>

      <SeccaoPerfil />
      {podeVerUtilizadores && <SeccaoUtilizadores />}
      {podeVerDepartamentos && <SeccaoDepartamentos />}
    </div>
  );
}
