import { BadRequestException, Controller, Headers, Inject, Post, RawBodyRequest, Req } from '@nestjs/common';
import type { Request } from 'express';
import type Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe-client.provider';
import { SubscricaoService } from './subscricao.service';

/**
 * `POST /webhooks/stripe` (Especificação Técnica do Passo 22) — endpoint
 * público, sem sessão, verificado por assinatura (ADR-008 §3.4, Blueprint
 * §4). Controlador dedicado, separado de `ComercialController` — evita
 * misturar a exigência de corpo bruto/sem sessão com os restantes
 * endpoints autenticados do módulo.
 *
 * Só `checkout.session.completed` é tratado neste passo (Decisão a
 * Validar A) — decisão consciente de âmbito, não uma omissão: qualquer
 * outro tipo de evento é reconhecido com `200` mas ignorado
 * deliberadamente (Decisão E), nunca um erro (evitaria reenvio indefinido
 * pela Stripe de um evento que decidimos não tratar).
 */
@Controller('webhooks')
export class StripeWebhookController {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly subscricaoService: SubscricaoService,
  ) {}

  @Post('stripe')
  async receberWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') assinatura: string) {
    let evento: Stripe.Event;
    try {
      evento = this.stripe.webhooks.constructEvent(req.rawBody!, assinatura, process.env.STRIPE_WEBHOOK_SECRET ?? '');
    } catch {
      // Fail Secure (Security & Access Principles §3.9) — assinatura
      // inválida ou em falta nunca é processada (ADR-008 §3.4).
      throw new BadRequestException('Assinatura inválida.');
    }

    if (evento.type !== 'checkout.session.completed') {
      return { recebido: true };
    }

    const sessao = evento.data.object as Stripe.Checkout.Session;
    const empresaId = sessao.metadata?.empresaId;
    if (!empresaId) {
      throw new BadRequestException('metadata.empresaId em falta.');
    }

    await this.subscricaoService.processarCheckoutConcluido(empresaId, evento.id, sessao);
    return { recebido: true };
  }
}
