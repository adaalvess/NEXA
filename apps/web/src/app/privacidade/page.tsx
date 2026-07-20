import Link from 'next/link';

/**
 * Política de Privacidade (Especificação Técnica do Passo 47) — rascunho
 * técnico RGPD. **Nunca substitui revisão jurídica profissional** — pontos
 * marcados `[A PREENCHER]` exigem confirmação da Fundadora/CEO antes deste
 * conteúdo poder ser usado com clientes reais em produção.
 *
 * Conteúdo factual (secção 3 da Especificação Técnica) descreve com precisão
 * o que o sistema realmente faz — não é suposição: subprocessadores,
 * cookies, retenção e o estado real (manual) do direito ao apagamento
 * (PSD-001 continua uma Questão em Aberto, nunca prometida como self-service
 * aqui).
 */
export default function PaginaPrivacidade() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div>
        <Link href="/" className="text-small text-nexa-purple hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-4 font-display text-h1 text-nexa-white">Política de Privacidade</h1>
        <p className="mt-2 text-small text-nexa-gray">Versão 1.0 — em vigor desde 20 de julho de 2026.</p>
      </div>

      <div className="space-y-6 text-body text-nexa-gray">
        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">1. Responsável pelo Tratamento</h2>
          <p>
            <strong className="text-nexa-white">[A PREENCHER: nome legal da entidade]</strong>, com sede em{' '}
            <strong className="text-nexa-white">[A PREENCHER: morada/país]</strong>, é a responsável pelo tratamento
            dos dados pessoais recolhidos através da NEXA. Não temos, nesta fase, um Encarregado de Proteção de
            Dados (DPO) formalmente nomeado <strong className="text-nexa-white">[A PREENCHER: confirmar]</strong> —
            para qualquer questão de privacidade, contacta{' '}
            <strong className="text-nexa-white">[A PREENCHER: contacto de privacidade]</strong>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">2. Dados que Recolhemos</h2>
          <p>Recolhemos os seguintes dados pessoais:</p>
          <ul className="ml-6 mt-2 list-disc space-y-1">
            <li>Dados de conta: nome, email, palavra-passe (nunca guardada em texto plano — usamos Argon2id, um algoritmo de hash com resistência reforçada).</li>
            <li>Dados de Empresa: nome, país, setor (opcional).</li>
            <li>Conteúdo que introduzes na plataforma: Processos, Clientes, interações, e o texto das perguntas que fazes ao Assistente de IA.</li>
            <li>Dados técnicos de sessão: um cookie de sessão estritamente necessário para manteres a sessão iniciada.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">3. Para que Usamos os Teus Dados (Base Legal)</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li><strong className="text-nexa-white">Execução do contrato</strong> — os dados operacionais (Processos, CRM, etc.) são tratados para te prestar o serviço a que subscreveste.</li>
            <li><strong className="text-nexa-white">Consentimento</strong> — o registo de uma nova conta exige o teu consentimento explícito a estes documentos, registado de forma permanente.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">4. Com Quem Partilhamos os Teus Dados</h2>
          <p>Usamos os seguintes subprocessadores, cada um só para a finalidade indicada:</p>
          <ul className="ml-6 mt-2 list-disc space-y-1">
            <li><strong className="text-nexa-white">Anthropic</strong> — recebe o texto das tuas perguntas ao Assistente de IA, para gerar a resposta.</li>
            <li><strong className="text-nexa-white">Stripe</strong> — processa pagamentos de planos pagos; nunca recebemos nem armazenamos os dados do teu cartão diretamente.</li>
            <li><strong className="text-nexa-white">Resend</strong> — envia emails de convite de utilizador em teu nome.</li>
            <li><strong className="text-nexa-white">Neon, Render, Vercel</strong> — alojam a base de dados e a aplicação, na União Europeia.</li>
          </ul>
          <p className="mt-2">
            Alguns destes subprocessadores podem estar sediados fora da União Europeia — nesses casos, a
            transferência é acautelada pelas Cláusulas Contratuais-Tipo (SCCs) desses fornecedores.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">5. Cookies</h2>
          <p>
            Usamos apenas um cookie de sessão estritamente necessário para autenticação (nunca cookies de análise,
            marketing ou rastreio) — por ser estritamente necessário ao funcionamento do serviço, não exige o teu
            consentimento prévio.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">6. Durante Quanto Tempo Guardamos os Teus Dados</h2>
          <p>
            Os dados operacionais são mantidos enquanto a tua conta permanecer ativa. Se eliminares um registo
            (Processo, Cliente, etc.), este fica ocultado de imediato mas pode ser mantido tecnicamente por um
            período adicional (soft-delete) antes de remoção física definitiva. O conteúdo das interações com o
            Assistente de IA tem um período de retenção configurável, gerido internamente.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">7. Os Teus Direitos</h2>
          <p>Nos termos do RGPD, tens direito a:</p>
          <ul className="ml-6 mt-2 list-disc space-y-1">
            <li>Aceder aos dados pessoais que temos sobre ti;</li>
            <li>Retificar dados incorretos;</li>
            <li>Solicitar o apagamento dos teus dados — <strong className="text-nexa-white">nesta fase, este pedido é processado manualmente através de contacto direto</strong>, não existe ainda um mecanismo self-service de eliminação definitiva;</li>
            <li>Portabilidade dos teus dados;</li>
            <li>Opor-te ao tratamento, em certas circunstâncias;</li>
            <li>Retirar o teu consentimento a qualquer momento (sem afetar o tratamento já realizado);</li>
            <li>Apresentar reclamação junto da autoridade de controlo competente <strong className="text-nexa-white">[A PREENCHER: confirmar CNPD ou equivalente]</strong>.</li>
          </ul>
          <p className="mt-2">
            Para exercer qualquer um destes direitos, contacta{' '}
            <strong className="text-nexa-white">[A PREENCHER: contacto de privacidade]</strong>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">8. Segurança</h2>
          <p>
            Aplicamos isolamento estrutural entre os dados de cada Empresa cliente (multi-tenancy), controlo de
            acesso por papel (RBAC), sessões seguras do lado do servidor, e registo de auditoria imutável de toda
            ação de escrita.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-h3 text-nexa-white">9. Alterações a Esta Política</h2>
          <p>
            Podemos atualizar esta Política ao longo do tempo. Alterações substantivas resultam numa nova versão
            numerada; a versão que aceitaste no registo fica registada de forma permanente e imutável.
          </p>
        </section>
      </div>
    </div>
  );
}
