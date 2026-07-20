import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import Stripe from 'stripe';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { ComercialModule } from '../src/modules/comercial/comercial.module';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';
const WEBHOOK_SECRET = 'whsec_test_secret_passo22';

/**
 * Webhooks Stripe — `POST /webhooks/stripe` (Especificação Técnica do
 * Passo 22). Assinatura verificada com o SDK real da Stripe
 * (`generateTestHeaderString`/`constructEvent`, Decisão F) — zero chamada
 * de rede real, mas prova genuína de que a validação criptográfica
 * funciona, não uma simulação.
 */
describe('Comercial — Webhooks Stripe (Passo 22)', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let stripeParaTestes: Stripe;

  beforeAll(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule, ComercialModule] }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();

    adminClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_ADMIN_URL } } });
    await adminClient.$connect();

    // Só para gerar assinaturas de teste localmente — nunca faz uma chamada de rede real.
    stripeParaTestes = new Stripe('sk_test_placeholder_geracao_local', { apiVersion: '2026-06-24.dahlia' });
  });

  afterAll(async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await adminClient.$disconnect();
    await app.close();
  });

  async function registar(sufixo: string) {
    const email = `webhook-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    const res = await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Webhook ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA }, aceiteTermos: true })
      .expect(201);
    return { empresaId: res.body.empresaId as string };
  }

  function payloadCheckoutCompleto(eventId: string, empresaId: string, customerId: string, subscriptionId: string): string {
    return JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_sessao',
          object: 'checkout.session',
          customer: customerId,
          subscription: subscriptionId,
          metadata: { empresaId },
        },
      },
    });
  }

  function payloadEventoIrrelevante(eventId: string): string {
    return JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'customer.created',
      data: { object: { id: 'cus_irrelevante' } },
    });
  }

  function assinar(payload: string): string {
    return stripeParaTestes.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  }

  it('T1 — assinatura válida, checkout.session.completed → SubscricaoPlano ativado', async () => {
    const { empresaId } = await registar('t1');
    const eventId = `evt_t1_${Date.now()}`;
    const payload = payloadCheckoutCompleto(eventId, empresaId, 'cus_t1', 'sub_t1');
    const assinatura = assinar(payload);

    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', assinatura)
      .send(payload)
      .expect(201);

    const subscricao = await adminClient.subscricaoPlano.findUniqueOrThrow({ where: { empresaId } });
    expect(subscricao.estado).toBe('ativa');
    expect(subscricao.stripeCustomerId).toBe('cus_t1');
    expect(subscricao.stripeSubscriptionId).toBe('sub_t1');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — assinatura inválida/adulterada → 400, SubscricaoPlano nunca alterado', async () => {
    const { empresaId } = await registar('t2');
    const eventId = `evt_t2_${Date.now()}`;
    const payload = payloadCheckoutCompleto(eventId, empresaId, 'cus_t2', 'sub_t2');

    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=assinatura_adulterada_nunca_valida')
      .send(payload)
      .expect(400);

    const subscricao = await adminClient.subscricaoPlano.findUniqueOrThrow({ where: { empresaId } });
    expect(subscricao.estado).toBe('trial');
    expect(subscricao.stripeCustomerId).toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — evento de tipo diferente (assinatura válida) → 201, SubscricaoPlano nunca alterado', async () => {
    const { empresaId } = await registar('t3');
    const eventId = `evt_t3_${Date.now()}`;
    const payload = payloadEventoIrrelevante(eventId);
    const assinatura = assinar(payload);

    const res = await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', assinatura)
      .send(payload)
      .expect(201);

    expect(res.body).toEqual({ recebido: true });

    const subscricao = await adminClient.subscricaoPlano.findUniqueOrThrow({ where: { empresaId } });
    expect(subscricao.estado).toBe('trial');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — reenvio do mesmo evento nunca reprocessa (idempotência real)', async () => {
    const { empresaId } = await registar('t4');
    const eventId = `evt_t4_${Date.now()}`;
    const payload = payloadCheckoutCompleto(eventId, empresaId, 'cus_t4', 'sub_t4');
    const assinatura = assinar(payload);

    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', assinatura)
      .send(payload)
      .expect(201);

    // Simula uma alteração manual entre as duas entregas — se o reenvio
    // reprocessasse, reverteria isto para 'ativa'/'cus_t4'/'sub_t4'.
    await adminClient.subscricaoPlano.update({
      where: { empresaId },
      data: { estado: 'cancelada', stripeCustomerId: 'cus_alterado_manualmente' },
    });

    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', assinatura)
      .send(payload)
      .expect(201);

    const subscricao = await adminClient.subscricaoPlano.findUniqueOrThrow({ where: { empresaId } });
    expect(subscricao.estado).toBe('cancelada');
    expect(subscricao.stripeCustomerId).toBe('cus_alterado_manualmente');

    const totalProcessados = await adminClient.webhookStripeProcessado.count({ where: { empresaId, stripeEventId: eventId } });
    expect(totalProcessados).toBe(1);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — metadata.empresaId em falta → 400', async () => {
    const eventId = `evt_t5_${Date.now()}`;
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test', object: 'checkout.session', customer: 'cus_t5', subscription: 'sub_t5', metadata: {} } },
    });
    const assinatura = assinar(payload);

    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', assinatura)
      .send(payload)
      .expect(400);
  });

  it('T6 — endpoint nunca exige sessão — pedido sem nenhum cookie de sessão é aceite normalmente', async () => {
    const { empresaId } = await registar('t6');
    const eventId = `evt_t6_${Date.now()}`;
    const payload = payloadCheckoutCompleto(eventId, empresaId, 'cus_t6', 'sub_t6');
    const assinatura = assinar(payload);

    // Nenhum `.set('Cookie', ...)` em lado nenhum deste pedido — só a
    // assinatura autentica o chamador (ADR-008 §3.4), nunca uma sessão.
    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', assinatura)
      .send(payload)
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});
