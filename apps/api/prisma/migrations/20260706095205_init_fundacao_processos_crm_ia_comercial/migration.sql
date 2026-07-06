-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "setor" TEXT,
    "estadoSubscricao" TEXT NOT NULL DEFAULT 'trial',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilizador" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "departamentoId" TEXT,
    "eliminadoEm" TIMESTAMP(3),
    "criadoPor" TEXT,
    "atualizadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilizador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "utilizadorId" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departamento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "eliminadoEm" TIMESTAMP(3),
    "criadoPor" TEXT,
    "atualizadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistoAuditoria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "ator" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistoAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partilha" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "entidadeTipo" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "convidadoId" TEXT NOT NULL,
    "concedidoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partilha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Processo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "departamentoId" TEXT,
    "clienteId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'por_fazer',
    "prazo" TIMESTAMP(3),
    "eliminadoEm" TIMESTAMP(3),
    "criadoPor" TEXT,
    "atualizadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "estadoOportunidade" TEXT,
    "eliminadoEm" TIMESTAMP(3),
    "criadoPor" TEXT,
    "atualizadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interacao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPor" TEXT,
    "atualizadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SugestaoIA" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "utilizadorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "entidadeRef" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendente',
    "fornecedorUsado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SugestaoIA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "tipoEvento" TEXT NOT NULL,
    "entidadeOrigemId" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscricaoPlano" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'trial',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "limiteUtilizadores" INTEGER NOT NULL,
    "limiteArmazenamentoMb" INTEGER NOT NULL,
    "limiteUsoIA" INTEGER NOT NULL,
    "trialIniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscricaoPlano_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Utilizador_empresaId_idx" ON "Utilizador"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilizador_empresaId_email_key" ON "Utilizador"("empresaId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilizador_id_empresaId_key" ON "Utilizador"("id", "empresaId");

-- CreateIndex
CREATE INDEX "Sessao_empresaId_idx" ON "Sessao"("empresaId");

-- CreateIndex
CREATE INDEX "Sessao_utilizadorId_idx" ON "Sessao"("utilizadorId");

-- CreateIndex
CREATE INDEX "Departamento_empresaId_idx" ON "Departamento"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_id_empresaId_key" ON "Departamento"("id", "empresaId");

-- CreateIndex
CREATE INDEX "RegistoAuditoria_empresaId_timestamp_idx" ON "RegistoAuditoria"("empresaId", "timestamp");

-- CreateIndex
CREATE INDEX "Partilha_empresaId_entidadeTipo_entidadeId_idx" ON "Partilha"("empresaId", "entidadeTipo", "entidadeId");

-- CreateIndex
CREATE INDEX "Processo_empresaId_idx" ON "Processo"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Processo_id_empresaId_key" ON "Processo"("id", "empresaId");

-- CreateIndex
CREATE INDEX "Cliente_empresaId_idx" ON "Cliente"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_id_empresaId_key" ON "Cliente"("id", "empresaId");

-- CreateIndex
CREATE INDEX "Interacao_empresaId_clienteId_idx" ON "Interacao"("empresaId", "clienteId");

-- CreateIndex
CREATE INDEX "SugestaoIA_empresaId_idx" ON "SugestaoIA"("empresaId");

-- CreateIndex
CREATE INDEX "Notificacao_empresaId_destinatarioId_idx" ON "Notificacao"("empresaId", "destinatarioId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscricaoPlano_empresaId_key" ON "SubscricaoPlano"("empresaId");

-- AddForeignKey
ALTER TABLE "Utilizador" ADD CONSTRAINT "Utilizador_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilizador" ADD CONSTRAINT "Utilizador_departamentoId_empresaId_fkey" FOREIGN KEY ("departamentoId", "empresaId") REFERENCES "Departamento"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_utilizadorId_empresaId_fkey" FOREIGN KEY ("utilizadorId", "empresaId") REFERENCES "Utilizador"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistoAuditoria" ADD CONSTRAINT "RegistoAuditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partilha" ADD CONSTRAINT "Partilha_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partilha" ADD CONSTRAINT "Partilha_convidadoId_empresaId_fkey" FOREIGN KEY ("convidadoId", "empresaId") REFERENCES "Utilizador"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partilha" ADD CONSTRAINT "Partilha_concedidoPorId_empresaId_fkey" FOREIGN KEY ("concedidoPorId", "empresaId") REFERENCES "Utilizador"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_responsavelId_empresaId_fkey" FOREIGN KEY ("responsavelId", "empresaId") REFERENCES "Utilizador"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_departamentoId_empresaId_fkey" FOREIGN KEY ("departamentoId", "empresaId") REFERENCES "Departamento"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_ownerId_empresaId_fkey" FOREIGN KEY ("ownerId", "empresaId") REFERENCES "Utilizador"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interacao" ADD CONSTRAINT "Interacao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interacao" ADD CONSTRAINT "Interacao_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugestaoIA" ADD CONSTRAINT "SugestaoIA_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugestaoIA" ADD CONSTRAINT "SugestaoIA_utilizadorId_empresaId_fkey" FOREIGN KEY ("utilizadorId", "empresaId") REFERENCES "Utilizador"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_destinatarioId_empresaId_fkey" FOREIGN KEY ("destinatarioId", "empresaId") REFERENCES "Utilizador"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscricaoPlano" ADD CONSTRAINT "SubscricaoPlano_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
