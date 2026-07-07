import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { EstadoVazioGuiado, EstadoVazioGuiadoProps } from './EstadoVazioGuiado';

/**
 * TabelaDados (Especificação Técnica do Passo 13, 3.5) — genérica sobre
 * qualquer lista tipada. Estado `vazio` usa `EstadoVazioGuiado` (3.6) em
 * vez de uma mensagem fixa.
 */
export interface ColunaTabela<T> {
  chave: string;
  cabecalho: string;
  render: (linha: T) => ReactNode;
}

export interface TabelaDadosProps<T> {
  colunas: ColunaTabela<T>[];
  linhas: T[];
  chaveLinha: (linha: T) => string;
  carregando?: boolean;
  estadoVazio: EstadoVazioGuiadoProps;
}

export function TabelaDados<T>({ colunas, linhas, chaveLinha, carregando, estadoVazio }: TabelaDadosProps<T>) {
  if (carregando) {
    return (
      <div className="space-y-2" role="status" aria-label="A carregar">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-nexa-charcoal" />
        ))}
      </div>
    );
  }

  if (linhas.length === 0) {
    return <EstadoVazioGuiado {...estadoVazio} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-body text-nexa-white">
        <thead>
          <tr className="border-b border-nexa-slate/20 text-left text-small text-nexa-gray">
            {colunas.map((coluna) => (
              <th key={coluna.chave} className="px-3 py-2 font-medium">
                {coluna.cabecalho}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={chaveLinha(linha)} className={cn('border-b border-nexa-slate/10 last:border-0')}>
              {colunas.map((coluna) => (
                <td key={coluna.chave} className="px-3 py-3">
                  {coluna.render(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
