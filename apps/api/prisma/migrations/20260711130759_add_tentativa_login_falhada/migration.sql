-- CreateTable
CREATE TABLE "TentativaLoginFalhada" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativaLoginFalhada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TentativaLoginFalhada_email_ip_criadoEm_idx" ON "TentativaLoginFalhada"("email", "ip", "criadoEm");
