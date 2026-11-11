import { prisma } from "./config/prisma.js";
import { iniciarReconciliação, workerTarefas } from "./modules/tarefas/tarefas.worker.js";
import { filaTarefas } from "./modules/tarefas/tarefas.queue.js";
import { iniciarAgendamentoAnalises } from "./modules/analises/analises.scheduler.js";

let encerrando = false;
const pararReconciliação = await iniciarReconciliação();
const pararAgendamentoAnalises = await iniciarAgendamentoAnalises();
console.info("Worker BullMQ iniciado.");

async function encerrar(sinal: string) {
  if (encerrando) return;
  encerrando = true;
  console.info(`${sinal} recebido; encerrando worker...`);
  pararReconciliação();
  try {
    await pararAgendamentoAnalises();
    await workerTarefas.close();
    await filaTarefas.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (erro) {
    console.error("Falha ao encerrar worker", erro);
    process.exit(1);
  }
}
process.on("SIGINT", () => void encerrar("SIGINT"));
process.on("SIGTERM", () => void encerrar("SIGTERM"));

workerTarefas.on("error", (erro) => console.error("Erro no worker BullMQ:", erro));
