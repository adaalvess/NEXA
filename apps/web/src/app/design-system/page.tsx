'use client';

import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Botao } from '../../components/ui/Botao';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { MenuDropdown } from '../../components/ui/MenuDropdown';
import { TabelaDados } from '../../components/ui/TabelaDados';
import { Cartao } from '../../components/ui/Cartao';
import { BadgeEstado, ValorEstado } from '../../components/ui/BadgeEstado';
import { Avatar } from '../../components/ui/Avatar';
import { EstadoVazioGuiado } from '../../components/ui/EstadoVazioGuiado';
import { useToast } from '../../hooks/use-toast';

const ESTADOS: ValorEstado[] = ['por_fazer', 'em_curso', 'concluida', 'prospecao', 'negociacao', 'fechada_ganha', 'fechada_perdida'];

interface LinhaExemplo {
  id: string;
  titulo: string;
  estado: ValorEstado;
}

const LINHAS_EXEMPLO: LinhaExemplo[] = [
  { id: '1', titulo: 'Preparar proposta comercial', estado: 'em_curso' },
  { id: '2', titulo: 'Rever contrato', estado: 'concluida' },
];

/**
 * Vitrine interna do Design System (Especificação Técnica do Passo 13,
 * 3.11) — rota `/design-system` (nunca `/_design-system`: em Next.js App
 * Router, pastas prefixadas com `_` são excluídas do routing — correção
 * técnica face ao literal da especificação, sem impacto na decisão em si).
 */
export default function PaginaDesignSystem() {
  const [modalAberto, setModalAberto] = useState(false);
  const [valorSelect, setValorSelect] = useState<string>();
  const [tabelaVazia, setTabelaVazia] = useState(false);
  const { mostrarToast } = useToast();

  return (
    <main className="mx-auto max-w-4xl space-y-12 p-8">
      <header>
        <h1 className="font-display text-display text-nexa-white">Design System — NEXA</h1>
        <p className="mt-2 text-body text-nexa-gray">Vitrine interna dos componentes base (Especificação Técnica do Passo 13).</p>
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-h2">Tipografia</h2>
        <p className="font-display text-display">Display 48/56</p>
        <p className="font-display text-h1">H1 36/44</p>
        <p className="font-display text-h2">H2 28/36</p>
        <p className="font-display text-h3">H3 22/28</p>
        <p className="text-body-lg">Body Large 18/28</p>
        <p className="text-body">Body 16/24</p>
        <p className="text-small">Small 14/20</p>
        <p className="text-caption">Caption 12/16</p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">Cores</h2>
        {/* Classes por extenso (não interpoladas) — o Tailwind só gera CSS
            para classes literais encontradas na análise estática do código,
            nunca para nomes construídos em runtime (`bg-${cor}` não funcionaria). */}
        <div className="grid grid-cols-4 gap-3">
          {(
            [
              ['nexa-black', 'bg-nexa-black'],
              ['nexa-charcoal', 'bg-nexa-charcoal'],
              ['nexa-slate', 'bg-nexa-slate'],
              ['nexa-purple', 'bg-nexa-purple'],
              ['nexa-violet', 'bg-nexa-violet'],
              ['success', 'bg-success'],
              ['warning', 'bg-warning'],
              ['error', 'bg-error'],
              ['info', 'bg-info'],
            ] as const
          ).map(([nome, classeFundo]) => (
            <div key={nome} className="space-y-1">
              <div className={`h-16 rounded border border-nexa-slate/20 ${classeFundo}`} />
              <p className="text-caption text-nexa-gray">{nome}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">Botao</h2>
        <div className="flex flex-wrap gap-3">
          <Botao variante="primaria">Primária</Botao>
          <Botao variante="secundaria">Secundária</Botao>
          <Botao variante="fantasma">Fantasma</Botao>
          <Botao variante="destrutiva">Destrutiva</Botao>
          <Botao carregando>A carregar</Botao>
          <Botao disabled>Desativado</Botao>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">Input</h2>
        <div className="max-w-sm space-y-3">
          <Input placeholder="Nome" />
          <Input placeholder="Com erro" erro />
          <Input placeholder="Desativado" disabled />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">Select</h2>
        <div className="max-w-sm">
          <Select
            placeholder="Escolhe um estado"
            valor={valorSelect}
            onValorChange={setValorSelect}
            opcoes={ESTADOS.map((e) => ({ valor: e, rotulo: e }))}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">Modal</h2>
        <Botao onClick={() => setModalAberto(true)}>Abrir Modal</Botao>
        <Modal aberto={modalAberto} onAbertoChange={setModalAberto} titulo="Título do Modal" descricao="Descrição opcional do modal.">
          <p className="text-body">Conteúdo do modal.</p>
        </Modal>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">MenuDropdown</h2>
        <MenuDropdown
          trigger={
            <button className="rounded p-2 hover:bg-nexa-charcoal" aria-label="Mais opções">
              <MoreVertical className="h-5 w-5" aria-hidden />
            </button>
          }
          itens={[
            { rotulo: 'Editar', onSelect: () => mostrarToast({ titulo: 'Editar selecionado', variante: 'info' }) },
            { rotulo: 'Eliminar', destrutivo: true, onSelect: () => mostrarToast({ titulo: 'Eliminar selecionado', variante: 'aviso' }) },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">Cartao</h2>
        <div className="grid grid-cols-2 gap-4">
          <Cartao>Cartão simples</Cartao>
          <Cartao interativo>Cartão interativo (hover)</Cartao>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">NotificacaoToast</h2>
        <div className="flex flex-wrap gap-3">
          <Botao variante="secundaria" onClick={() => mostrarToast({ titulo: 'Sucesso', descricao: 'Ação concluída.', variante: 'sucesso' })}>
            Sucesso
          </Botao>
          <Botao variante="secundaria" onClick={() => mostrarToast({ titulo: 'Erro', descricao: 'Algo falhou.', variante: 'erro' })}>
            Erro
          </Botao>
          <Botao variante="secundaria" onClick={() => mostrarToast({ titulo: 'Aviso', variante: 'aviso' })}>
            Aviso
          </Botao>
          <Botao variante="secundaria" onClick={() => mostrarToast({ titulo: 'Informação', variante: 'info' })}>
            Info
          </Botao>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">BadgeEstado</h2>
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map((estado) => (
            <BadgeEstado key={estado} estado={estado} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">Avatar</h2>
        <div className="flex gap-3">
          <Avatar nome="Admin Empresa" />
          <Avatar nome="Gestor Vendas" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">TabelaDados</h2>
        <Botao variante="secundaria" tamanho="sm" onClick={() => setTabelaVazia((v) => !v)}>
          Alternar estado vazio
        </Botao>
        <TabelaDados
          colunas={[
            { chave: 'titulo', cabecalho: 'Título', render: (l: LinhaExemplo) => l.titulo },
            { chave: 'estado', cabecalho: 'Estado', render: (l: LinhaExemplo) => <BadgeEstado estado={l.estado} /> },
          ]}
          linhas={tabelaVazia ? [] : LINHAS_EXEMPLO}
          chaveLinha={(l) => l.id}
          estadoVazio={{
            titulo: 'Ainda não há Processos',
            descricao: 'Cria o teu primeiro Processo para começares a organizar o trabalho da tua equipa.',
            acaoLabel: 'Criar Processo',
            onAcao: () => mostrarToast({ titulo: 'Criar Processo', variante: 'info' }),
          }}
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-h2">EstadoVazioGuiado (isolado)</h2>
        <EstadoVazioGuiado
          titulo="Ainda não há Clientes"
          descricao="Regista o teu primeiro Cliente para começares a construir o teu CRM."
          acaoLabel="Criar Cliente"
          onAcao={() => mostrarToast({ titulo: 'Criar Cliente', variante: 'info' })}
        />
      </section>
    </main>
  );
}
