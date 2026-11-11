-- Registra a duração da última tentativa de processamento da tarefa.
ALTER TABLE `TarefaAssincrona`
  ADD COLUMN `duracaoMs` INTEGER NULL;
