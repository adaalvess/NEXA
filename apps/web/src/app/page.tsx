import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Cartao } from '../components/ui/Cartao';
import { obterSessaoServidor } from '../lib/sessao-servidor';

const PILARES = [
  { titulo: 'Um só lugar, uma só verdade' },
  { titulo: 'Controlo antes de automação' },
  { titulo: 'Rápido a adotar, sem fricção de implementação' },
];

const MODULOS = [
  { titulo: 'Dashboard Inteligente', descricao: 'Visão consolidada de indicadores, tarefas, notificações e atividades relevantes da empresa, agregando dados dos restantes módulos.' },
  { titulo: 'Gestão de Processos e Tarefas', descricao: 'Criação, acompanhamento e automatização de processos, projetos e tarefas.' },
  { titulo: 'CRM Inteligente', descricao: 'Gestão de clientes, empresas, contactos, oportunidades e histórico de interações. Acompanhamento comercial com apoio da IA.' },
  { titulo: 'Assistente de IA', descricao: 'Responde a perguntas sobre dados existentes na plataforma. Sugere automatizações e melhorias; propõe ações, nunca as executa sem confirmação explícita.', subtitulo: 'A IA da NEXA sugere; você decide.' },
];

const CTA_PRIMARIO = 'inline-flex h-12 items-center justify-center gap-2 rounded bg-gradient-to-br from-nexa-purple to-nexa-violet px-6 text-body-lg font-medium text-nexa-white shadow-glow-purple transition-colors hover:brightness-110';
const CTA_SECUNDARIO = 'inline-flex h-12 items-center justify-center gap-2 rounded border border-nexa-slate/40 px-6 text-body-lg font-medium text-nexa-white transition-colors hover:bg-nexa-charcoal';

/**
 * Landing Page pública (Especificação Técnica do Passo 25) — segundo passo
 * do M5, Bloco A. Toda a copy é citação direta de documentos já aprovados
 * (Product Vision §3.1/3.5, Brand Book §3.9, PRD §3.4), sem frase nova —
 * ver §3.2 da especificação para a origem exata de cada linha.
 *
 * Headline corrigido após aprovação inicial (Decisão B revista pela
 * Fundadora/CEO): a citação do Product Vision §3.1 ("O Produto em Uma
 * Frase") passou de subheadline a headline único, em vez da frase da
 * coluna "Preferir" do Brand Book §3.9 — essa frase é só um exemplo
 * ilustrativo de tom, nunca foi pensada como headline definitivo, e
 * duplicava o conteúdo do subheadline. O subtítulo do cartão "Assistente
 * de IA" ("A IA da NEXA sugere; você decide.") mantém-se — é descrição
 * factual do comportamento real da IA, já citada em PRD/Competitive
 * Analysis, não um mero exemplo de tom.
 *
 * Comportamento com sessão válida mantém-se inalterado (Decisão D1,
 * redireciona sempre para `/dashboard`); `obterSessaoServidor()` já lê
 * `cookies()`, por isso esta rota é automaticamente dinâmica — sem
 * `export const dynamic = 'force-dynamic'` explícito (Decisão D2,
 * diferente de `/precos`, Passo 24, que não lê nenhum cookie).
 */
export default async function Home() {
  const sessao = await obterSessaoServidor();
  if (sessao) {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-20 p-8 py-16">
      <section className="space-y-6 text-center">
        <p className="text-small font-medium uppercase tracking-wide text-nexa-purple">Sistema Operacional Inteligente para Empresas</p>
        <h1 className="mx-auto max-w-3xl font-display text-h1 text-nexa-white">
          A NEXA é o Sistema Operacional Inteligente onde uma PME organiza a sua operação, gere os seus clientes e toma decisões — com uma IA que
          entende o negócio como um todo e ajuda a executá-lo, sempre sob o controlo do utilizador.
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className={CTA_PRIMARIO}>
            Começar
          </Link>
          <Link href="/precos" className={CTA_SECUNDARIO}>
            Ver Preços
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PILARES.map((p) => (
          <Cartao key={p.titulo} className="text-center">
            <p className="font-display text-h3 text-nexa-white">{p.titulo}</p>
          </Cartao>
        ))}
      </section>

      <section className="space-y-8">
        <h2 className="text-center font-display text-h2 text-nexa-white">Módulos</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {MODULOS.map((m) => (
            <Cartao key={m.titulo} className="space-y-2">
              <p className="font-display text-h3 text-nexa-white">{m.titulo}</p>
              <p className="text-small text-nexa-gray">{m.descricao}</p>
              {m.subtitulo && <p className="text-small font-medium text-nexa-purple">{m.subtitulo}</p>}
            </Cartao>
          ))}
        </div>
      </section>

      <section className="text-center">
        <Link href="/login" className={CTA_PRIMARIO}>
          Começar
        </Link>
      </section>
    </div>
  );
}
