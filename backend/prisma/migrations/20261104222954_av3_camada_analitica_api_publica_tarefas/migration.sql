-- CreateTable
CREATE TABLE `AvaliacaoRecuperacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipamentoId` INTEGER NOT NULL,
    `material` VARCHAR(191) NOT NULL,
    `valorEstimado` DECIMAL(12, 2) NOT NULL,
    `valorRealizado` DECIMAL(12, 2) NULL,
    `avaliadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `realizadoEm` DATETIME(3) NULL,
    `responsavel` VARCHAR(191) NULL,
    `observacao` TEXT NULL,

    INDEX `AvaliacaoRecuperacao_equipamentoId_idx`(`equipamentoId`),
    INDEX `AvaliacaoRecuperacao_avaliadoEm_idx`(`avaliadoEm`),
    INDEX `AvaliacaoRecuperacao_material_idx`(`material`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistoricoFalha` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipamentoId` INTEGER NOT NULL,
    `ocorridoEm` DATETIME(3) NOT NULL,
    `descricao` TEXT NOT NULL,
    `custoReparo` DECIMAL(12, 2) NULL,
    `resolvido` BOOLEAN NOT NULL DEFAULT false,
    `resolvidoEm` DATETIME(3) NULL,
    `observacao` TEXT NULL,

    INDEX `HistoricoFalha_equipamentoId_ocorridoEm_idx`(`equipamentoId`, `ocorridoEm`),
    INDEX `HistoricoFalha_resolvido_idx`(`resolvido`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistoricoDepreciacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipamentoId` INTEGER NOT NULL,
    `dataReferencia` DATETIME(3) NOT NULL,
    `valorBase` DECIMAL(12, 2) NOT NULL,
    `valorAtual` DECIMAL(12, 2) NOT NULL,
    `valorDepreciado` DECIMAL(12, 2) NOT NULL,
    `percentualDepreciacao` DECIMAL(7, 4) NOT NULL,
    `metodo` VARCHAR(191) NOT NULL,
    `observacao` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HistoricoDepreciacao_equipamentoId_dataReferencia_idx`(`equipamentoId`, `dataReferencia`),
    UNIQUE INDEX `HistoricoDepreciacao_equipamentoId_dataReferencia_key`(`equipamentoId`, `dataReferencia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResultadoAnalitico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizacaoId` INTEGER NULL,
    `tipo` ENUM('EFICIENCIA_OPERACIONAL', 'RENTABILIDADE_EQUIPAMENTOS', 'VIDA_UTIL_REMANESCENTE') NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `dados` JSON NOT NULL,
    `parametros` JSON NULL,
    `periodoInicio` DATETIME(3) NULL,
    `periodoFim` DATETIME(3) NULL,
    `geradoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `versaoModelo` VARCHAR(191) NULL,

    INDEX `ResultadoAnalitico_tipo_geradoEm_idx`(`tipo`, `geradoEm`),
    INDEX `ResultadoAnalitico_organizacaoId_tipo_idx`(`organizacaoId`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChaveApi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizacaoId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `prefixo` VARCHAR(191) NOT NULL,
    `hashChave` VARCHAR(191) NOT NULL,
    `permissoes` JSON NOT NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `expiraEm` DATETIME(3) NULL,
    `ultimoUsoEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revogadoEm` DATETIME(3) NULL,

    UNIQUE INDEX `ChaveApi_hashChave_key`(`hashChave`),
    INDEX `ChaveApi_organizacaoId_ativa_idx`(`organizacaoId`, `ativa`),
    INDEX `ChaveApi_prefixo_idx`(`prefixo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TarefaAssincrona` (
    `id` VARCHAR(36) NOT NULL,
    `organizacaoId` INTEGER NULL,
    `chaveApiId` INTEGER NULL,
    `tipo` ENUM('GERACAO_RELATORIO', 'ANALISE_EFICIENCIA', 'ANALISE_RENTABILIDADE', 'ANALISE_VIDA_UTIL', 'ANALISE_COMPLETA') NOT NULL,
    `status` ENUM('PENDENTE', 'PROCESSANDO', 'CONCLUIDA', 'FALHOU', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
    `parametros` JSON NULL,
    `resultado` JSON NULL,
    `arquivoUrl` TEXT NULL,
    `formatoArquivo` VARCHAR(191) NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `maxTentativas` INTEGER NOT NULL DEFAULT 3,
    `erro` TEXT NULL,
    `iniciadaEm` DATETIME(3) NULL,
    `concluidaEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `TarefaAssincrona_status_criadoEm_idx`(`status`, `criadoEm`),
    INDEX `TarefaAssincrona_organizacaoId_criadoEm_idx`(`organizacaoId`, `criadoEm`),
    INDEX `TarefaAssincrona_chaveApiId_idx`(`chaveApiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Equipamento_tipo_estadoFisico_idx` ON `Equipamento`(`tipo`, `estadoFisico`);

-- CreateIndex
CREATE INDEX `Movimentacao_dataHora_idx` ON `Movimentacao`(`dataHora`);

-- AddForeignKey
ALTER TABLE `AvaliacaoRecuperacao` ADD CONSTRAINT `AvaliacaoRecuperacao_equipamentoId_fkey` FOREIGN KEY (`equipamentoId`) REFERENCES `Equipamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricoFalha` ADD CONSTRAINT `HistoricoFalha_equipamentoId_fkey` FOREIGN KEY (`equipamentoId`) REFERENCES `Equipamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricoDepreciacao` ADD CONSTRAINT `HistoricoDepreciacao_equipamentoId_fkey` FOREIGN KEY (`equipamentoId`) REFERENCES `Equipamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResultadoAnalitico` ADD CONSTRAINT `ResultadoAnalitico_organizacaoId_fkey` FOREIGN KEY (`organizacaoId`) REFERENCES `Organizacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChaveApi` ADD CONSTRAINT `ChaveApi_organizacaoId_fkey` FOREIGN KEY (`organizacaoId`) REFERENCES `Organizacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TarefaAssincrona` ADD CONSTRAINT `TarefaAssincrona_organizacaoId_fkey` FOREIGN KEY (`organizacaoId`) REFERENCES `Organizacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TarefaAssincrona` ADD CONSTRAINT `TarefaAssincrona_chaveApiId_fkey` FOREIGN KEY (`chaveApiId`) REFERENCES `ChaveApi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
