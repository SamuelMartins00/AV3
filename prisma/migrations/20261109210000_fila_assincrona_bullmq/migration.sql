-- Metadados de idempotência e expiração do resultado assíncrono.
ALTER TABLE `TarefaAssincrona`
  ADD COLUMN `chaveIdempotencia` VARCHAR(191) NULL,
  ADD COLUMN `resultadoExpiraEm` DATETIME(3) NULL;

CREATE UNIQUE INDEX `TarefaAssincrona_chaveIdempotencia_key`
  ON `TarefaAssincrona`(`chaveIdempotencia`);

CREATE INDEX `TarefaAssincrona_status_resultadoExpiraEm_idx`
  ON `TarefaAssincrona`(`status`, `resultadoExpiraEm`);
