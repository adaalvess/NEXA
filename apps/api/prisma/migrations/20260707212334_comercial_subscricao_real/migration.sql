/*
  Warnings:

  - You are about to drop the column `estadoSubscricao` on the `Empresa` table. All the data in the column will be lost.
  - The `estado` column on the `SubscricaoPlano` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `plano` on the `SubscricaoPlano` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Plano" AS ENUM ('starter', 'professional', 'enterprise');

-- CreateEnum
CREATE TYPE "EstadoSubscricao" AS ENUM ('trial', 'ativa', 'limitada', 'cancelada');

-- AlterTable
ALTER TABLE "Empresa" DROP COLUMN "estadoSubscricao";

-- AlterTable
ALTER TABLE "SubscricaoPlano" DROP COLUMN "plano",
ADD COLUMN     "plano" "Plano" NOT NULL,
DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoSubscricao" NOT NULL DEFAULT 'trial',
ALTER COLUMN "limiteUtilizadores" DROP NOT NULL,
ALTER COLUMN "limiteArmazenamentoMb" DROP NOT NULL,
ALTER COLUMN "limiteUsoIA" DROP NOT NULL;
