import "dotenv/config";

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente ausente: ${nome}`);
  }
  return valor;
}

function inteiroPositivo(nome: string, padrao: number): number {
  const valor = Number(process.env[nome] ?? padrao);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`${nome} deve ser um número inteiro positivo`);
  }
  return valor;
}

export const env = {
  port: inteiroPositivo("PORT", 3000),
  host: process.env.HOST ?? "127.0.0.1",
  databaseUrl: obrigatoria("DATABASE_URL"),
  jwtSecret: obrigatoria("JWT_SECRET"),
  jwtAccessExpira: process.env.JWT_ACCESS_EXPIRES ?? "15m",
  refreshTtlMinutos: inteiroPositivo("REFRESH_TTL_MINUTES", 30),
  bcryptCusto: inteiroPositivo("BCRYPT_COST", 10),
  redisUrl: urlRedis("REDIS_URL", "redis://127.0.0.1:6379/0"),
  redisPrefix: prefixoRedis(),
  workerConcurrency: inteiroPositivo("WORKER_CONCURRENCY", 3),
  taskMaxAttempts: inteiroPositivo("TASK_MAX_ATTEMPTS", 3),
  taskBackoffMs: inteiroPositivo("TASK_BACKOFF_MS", 5000),
  taskStaleMs: inteiroPositivo("TASK_STALE_MS", 300000),
  taskResultTtlHours: inteiroPositivo("TASK_RESULT_TTL_HOURS", 168),
  analyticsScheduleEnabled: process.env.ANALYTICS_SCHEDULE_ENABLED === "true",
  analyticsScheduleCron: process.env.ANALYTICS_SCHEDULE_CRON ?? "0 2 * * *",
  analyticsScheduleTimezone: timezoneAnalitico(),
} as const;

function urlRedis(nome: string, padrao: string): string {
  const valor = process.env[nome] ?? padrao;
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new Error(`${nome} deve ser uma URL Redis válida`);
  }
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error(`${nome} deve utilizar o protocolo redis:// ou rediss://`);
  }
  if (!url.hostname) throw new Error(`${nome} deve informar o host do Redis`);
  if (url.port && (!Number.isInteger(Number(url.port)) || Number(url.port) < 1 || Number(url.port) > 65535)) {
    throw new Error(`${nome} possui uma porta inválida`);
  }
  const database = url.pathname.slice(1);
  if (database && !/^\d+$/.test(database)) {
    throw new Error(`${nome} deve usar um índice de banco Redis numérico no caminho`);
  }
  return valor;
}


function prefixoRedis(): string {
  const valor = process.env.REDIS_PREFIX ?? "greencode";
  // O BullMQ proíbe ":" no nome da fila. Mantemos o prefixo
  // simples para formar nomes previsíveis, como "greencode-tarefas".
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(valor) || valor.includes(":")) {
    throw new Error("REDIS_PREFIX deve conter apenas letras, números, hífen ou underscore (máximo de 50 caracteres)");
  }
  return valor;
}

function timezoneAnalitico(): string {
  const valor = process.env.ANALYTICS_SCHEDULE_TIMEZONE ?? "America/Sao_Paulo";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: valor });
  } catch {
    throw new Error("ANALYTICS_SCHEDULE_TIMEZONE deve ser um fuso IANA válido (ex.: America/Sao_Paulo)");
  }
  return valor;
}
