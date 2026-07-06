/*
  Warnings:

  - The `estado` column on the `Processo` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EstadoProcesso" AS ENUM ('por_fazer', 'em_curso', 'concluida');

-- AlterTable
ALTER TABLE "Processo" ADD COLUMN     "descricao" TEXT,
DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoProcesso" NOT NULL DEFAULT 'por_fazer';
