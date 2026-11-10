import "dotenv/config";
import { defineConfig } from "vitest/config";

const urlTeste = process.env.TEST_DATABASE_URL;
const redisTeste = process.env.TEST_REDIS_URL;
if (!redisTeste) {
  throw new Error("Defina TEST_REDIS_URL para Redis exclusivo de testes (ex.: redis://localhost:6379/1).");
}
if (new URL(redisTeste).pathname === "/0") {
  throw new Error("TEST_REDIS_URL não pode utilizar o banco lógico Redis /0.");
}
if (!urlTeste) {
  throw new Error(
    "Defina TEST_DATABASE_URL no .env com um banco exclusivo para testes (ex.: logistica_db_test).",
  );
}

// Os testes apagam todos os dados do banco: por isso só rodam em um banco
// cujo nome termina em "_test". O banco de desenvolvimento nunca é tocado.
export default defineConfig({
  test: {
    include: ["tests/integracao/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      DATABASE_URL: urlTeste,
      JWT_SECRET: "segredo-de-teste-da-integracao",
      REDIS_URL: redisTeste,
      TASK_BACKOFF_MS: "50",
      TASK_STALE_MS: "1000",
      BCRYPT_COST: "4",
      REFRESH_TTL_MINUTES: "30",
    },
  },
});
