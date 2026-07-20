import Link from 'next/link';

/**
 * Termos de Serviço (Especificação Técnica do Passo 47) — rascunho técnico,
 * estruturado com base em práticas comuns de SaaS B2B europeu. **Nunca
 * substitui revisão jurídica profissional** — pontos marcados
 * `[A PREENCHER]` exigem confirmação da Fundadora/CEO antes deste conteúdo
 * poder ser usado com clientes reais em produção (condição já fixada na
 * aprovação do M8/Passo 47).
 *
 * Server Component estático — mesmo espírito simples de `/precos`, sem
 * chamada a API (conteúdo não depende de dados dinâmicos).
 */
export default function PaginaTermos() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div>
        <Link href="/" className="text-small text-nexa-purple hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-4 font-display text-h1 text-nexa-white">Termos de Serviço</h1>
        <p className="mt-2 text-small text-nexa-gray">Versão 1.0 — em vigor desde 20 de julho de 2026.</p>
      </div>

      <div className="space-y-6 text-body text-nexa-gray">
        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">1. Identificação</h2>
          <p>
            A NEXA (&quot;nós&quot;, &quot;a plataforma&quot;) é operada por{' '}
            <strong className="text-nexa-white">[A PREENCHER: nome legal da entidade]</strong>, com sede em{' '}
            <strong className="text-nexa-white">[A PREENCHER: morada/país]</strong>, número de identificação fiscal{' '}
            <strong className="text-nexa-white">[A PREENCHER: NIF]</strong>. Para questões relacionadas com estes
            Termos, contacta-nos através de <strong className="text-nexa-white">[A PREENCHER: contacto legal]</strong>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">2. Objeto do Serviço</h2>
          <p>
            A NEXA é uma plataforma de gestão empresarial (processos, CRM, dashboard e um assistente de Inteligência
            Artificial) destinada a pequenas e médias empresas. O acesso é feito através de uma conta associada a
            uma Empresa (o &quot;Workspace&quot;), com um período experimental (&quot;trial&quot;) seguido, opcionalmente, de uma
            subscrição paga.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">3. Conta e Registo</h2>
          <p>
            Ao registares uma conta, garantes que a informação fornecida é verdadeira e que tens autoridade para
            vincular a Empresa que representas. És responsável por manter a confidencialidade da tua palavra-passe e
            por toda a atividade realizada através da tua conta.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">4. Assistente de Inteligência Artificial</h2>
          <p>
            O Assistente de IA da NEXA sugere ações e responde a perguntas com base nos dados da tua Empresa — nunca
            executa uma ação sem a tua confirmação explícita. As respostas geradas por IA podem conter imprecisões e
            não substituem aconselhamento profissional (jurídico, financeiro, ou de qualquer outra natureza). A
            utilização desta funcionalidade é da tua responsabilidade.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">5. Planos e Pagamento</h2>
          <p>
            Cada plano tem limites próprios (utilizadores, armazenamento, pedidos ao Assistente de IA por mês),
            descritos em <Link href="/precos" className="text-nexa-purple hover:underline">/precos</Link>. Os
            pagamentos de planos pagos são processados por um prestador de serviços de pagamento terceiro (Stripe) —
            a NEXA nunca armazena diretamente os dados do teu cartão.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">6. Disponibilidade do Serviço</h2>
          <p>
            Envidamos esforços razoáveis para manter o serviço disponível, mas não garantimos disponibilidade
            ininterrupta. Podemos suspender o acesso temporariamente para manutenção, com aviso prévio sempre que
            possível.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">7. Propriedade Intelectual</h2>
          <p>
            Os dados que introduzes na plataforma (Processos, Clientes, interações) pertencem a ti/à tua Empresa. A
            NEXA mantém a propriedade do software, da marca e do design da plataforma.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">8. Limitação de Responsabilidade</h2>
          <p>
            Na medida máxima permitida por lei, a NEXA não é responsável por danos indiretos, lucros cessantes, ou
            perda de dados resultante de uso indevido da plataforma. Nada nestes Termos limita responsabilidade que
            não possa ser legalmente limitada.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">9. Rescisão</h2>
          <p>
            Podes deixar de usar a NEXA a qualquer momento. Reservamo-nos o direito de suspender contas que violem
            estes Termos, com aviso prévio sempre que a situação o permita.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">10. Alterações a Estes Termos</h2>
          <p>
            Podemos atualizar estes Termos ao longo do tempo. Alterações substantivas resultam numa nova versão
            numerada; a versão que aceitaste no registo fica registada de forma permanente.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">11. Lei Aplicável</h2>
          <p>
            Estes Termos regem-se pela lei <strong className="text-nexa-white">[A PREENCHER: jurisdição, assume-se Portugal]</strong>,
            sem prejuízo dos direitos que te assistem enquanto residente na União Europeia.
          </p>
        </section>
      </div>
    </div>
  );
}
