-- CreateTable
CREATE TABLE "WebhookStripeProcessado" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "processadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookStripeProcessado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookStripeProcessado_stripeEventId_key" ON "WebhookStripeProcessado"("stripeEventId");

-- CreateIndex
CREATE INDEX "WebhookStripeProcessado_empresaId_idx" ON "WebhookStripeProcessado"("empresaId");

-- AddForeignKey
ALTER TABLE "WebhookStripeProcessado" ADD CONSTRAINT "WebhookStripeProcessado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
