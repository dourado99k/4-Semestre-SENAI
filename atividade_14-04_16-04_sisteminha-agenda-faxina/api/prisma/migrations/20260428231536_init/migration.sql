-- AlterTable
ALTER TABLE `Agendamento` MODIFY `endereco` VARCHAR(255) NOT NULL,
    MODIFY `observacoes` TEXT NULL;

-- AlterTable
ALTER TABLE `Usuario` MODIFY `senha` VARCHAR(255) NOT NULL;
