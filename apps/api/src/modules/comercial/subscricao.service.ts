import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { EstadoSubscricao, Papel } from '@prisma/client';
import type Stripe from 'stripe';
import { TenantPrismaService } from '../fundacao/prisma/tenant-prisma.service';
import { tenantContext } from '../fundacao/tenant/tenant-context';
import { STRIPE_CLIENT } from './stripe-client.provider';
import { obterPrecoStripe } from './precos-stripe';
import type { PlanoCheckout } from './dto/criar-checkout.dto';

// FR-30, literal — não uma configuração de negócio em aberto.
const TRIAL_DURACAO_DIAS = 14;

/**
 * Único ponto de cálculo do estado efetivo de subscrição (Especificação
 * Técnica do Passo 20, 3.1) — consumido pelo `SubscricaoGuard` (RN-11) e,
 * no futuro, por `GET /subscricao` (Passo 23), nunca duplicado.
 *
 * "Efetivo" distingue-se do `estado` armazenado em `SubscricaoPlano`: um
 * trial expirado nunca é escrito como `limitada` por um job em segundo
 * plano (o projeto evita deliberadamente introduzir infraestrutura de
 * tarefas agendadas antes de ser genuinamente necessária, mesmo raciocínio
 * já usado em PSD-003/ADR-005 §3.9a) — é sempre recalculado a partir de
 * `trialIniciadoEm`. `estado` armazenado só muda por eventos reais
 * (pagamento confirmado, Passo 22).
 */
@Injectable()
export class SubscricaoService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  async obterEstadoEfetivo(empresaId: string): Promise<EstadoSubscricao> {
    const subscricao = await this.tenantPrisma.client.subscricaoPlano.findUnique({ where: { empresaId } });

    // Fail Secure — nunca deveria acontecer desde o Passo 19 (toda Empresa
    // ganha uma subscrição de trial automaticamente), mas a ausência de
    // dados nunca é lida como acesso total.
    if (!subscricao) {
      return 'limitada';
    }

    if (subscricao.estado === 'trial') {
      const diasDesde = (Date.now() - subscricao.trialIniciadoEm.getTime()) / (1000 * 60 * 60 * 24);
      return diasDesde > TRIAL_DURACAO_DIAS ? 'limitada' : 'trial';
    }

    return subscricao.estado;
  }

  /**
   * Cria uma sessão de Stripe Checkout (UC-07; Especificação Técnica do
   * Passo 21, 3.3) — único ponto responsável por esta lógica (pedido
   * explícito da Fundadora/CEO, single source of truth). Nunca invocado
   * antes deste momento (RN-02, ADR-008 §3.3) — este método é a primeira
   * vez que a Stripe é contactada em todo o projeto.
   */
  async criarCheckout(plano: PlanoCheckout): Promise<{ url: string }> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    const precoId = obterPrecoStripe(plano);
    if (!precoId) {
      throw new BadRequestException('Plano inválido ou não configurado para checkout self-service.');
    }

    const estadoAtual = await this.obterEstadoEfetivo(ctx.empresaId);
    if (estadoAtual === 'ativa') {
      throw new ConflictException('Esta Empresa já tem uma subscrição ativa.');
    }

    const subscricao = await this.tenantPrisma.client.subscricaoPlano.findUnique({ where: { empresaId: ctx.empresaId } });

    const sessao = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: precoId, quantity: 1 }],
      customer: subscricao?.stripeCustomerId ?? undefined,
      // Único elo entre a sessão Stripe e a Empresa (ADR-008 §3.3) — o
      // Passo 22 (webhook) usa isto para saber qual Empresa atualizar.
      metadata: { empresaId: ctx.empresaId },
      success_url: `${process.env.WEB_APP_URL}/dashboard?checkout=sucesso&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.WEB_APP_URL}/dashboard?checkout=cancelado`,
    });

    return { url: sessao.url! };
  }

  /**
   * Processa `checkout.session.completed` (Especificação Técnica do Passo
   * 22, 3.4) — chamado só depois da assinatura do webhook já ter sido
   * verificada pelo `StripeWebhookController`, nunca antes. `tenantContext.run()`
   * explícito, mesmo padrão já usado pelo `SubscricaoListener` (Passo 19) —
   * primeira reutilização deste padrão fora de um evento interno.
   *
   * Idempotente por `stripeEventId` (ADR-008 §3.4/Decisão D): verifica
   * primeiro se o evento já foi processado, só depois muta `SubscricaoPlano`,
   * só depois regista o evento como processado.
   */
  async processarCheckoutConcluido(empresaId: string, stripeEventId: string, sessao: Stripe.Checkout.Session): Promise<void> {
    await tenantContext.run({ utilizadorId: 'stripe-webhook', empresaId, papel: Papel.admin_empresa }, async () => {
      const jaProcessado = await this.tenantPrisma.client.webhookStripeProcessado.findUnique({ where: { stripeEventId } });
      if (jaProcessado) {
        return; // idempotência — nunca reprocessa.
      }

      await this.tenantPrisma.client.subscricaoPlano.update({
        where: { empresaId },
        data: {
          estado: 'ativa',
          stripeCustomerId: typeof sessao.customer === 'string' ? sessao.customer : (sessao.customer?.id ?? undefined),
          stripeSubscriptionId: typeof sessao.subscription === 'string' ? sessao.subscription : (sessao.subscription?.id ?? undefined),
        },
      });

      await this.tenantPrisma.client.webhookStripeProcessado.create({ data: { empresaId, stripeEventId } });
    });
  }
}
