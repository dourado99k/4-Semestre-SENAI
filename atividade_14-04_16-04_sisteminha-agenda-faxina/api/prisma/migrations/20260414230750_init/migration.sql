/*
  Warnings:

  - You are about to drop the `AgendarFaxina` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuario` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `AgendarFaxina`;

-- DropTable
DROP TABLE `usuario`;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    UNIQUE INDEX `Usuario_cpf_key`(`cpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Agendamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dataHora` DATETIME(3) NOT NULL,
    `endereco` VARCHAR(191) NOT NULL,
    `complemento` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NOT NULL,
    `tipoServico` ENUM('FAXINA_COMPLETA', 'FAXINA_RAPIDA', 'POS_OBRA', 'COMERCIAL') NOT NULL,
    `comodos` INTEGER NOT NULL DEFAULT 1,
    `observacoes` VARCHAR(191) NULL,
    `status` ENUM('PENDENTE', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
    `valor` DOUBLE NULL,
    `usuarioId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Agendamento` ADD CONSTRAINT `Agendamento_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
