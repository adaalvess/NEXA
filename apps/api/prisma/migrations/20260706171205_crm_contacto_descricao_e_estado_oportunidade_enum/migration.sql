/*
  Warnings:

  - The `estadoOportunidade` column on the `Cliente` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EstadoOportunidade" AS ENUM ('prospecao', 'negociacao', 'fechada_ganha', 'fechada_perdida');

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "contactoPrincipal" TEXT,
DROP COLUMN "estadoOportunidade",
ADD COLUMN     "estadoOportunidade" "EstadoOportunidade";

-- AlterTable
ALTER TABLE "Interacao" ADD COLUMN     "descricao" TEXT;
