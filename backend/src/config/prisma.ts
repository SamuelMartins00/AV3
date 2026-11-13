import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";
import { montarOpcoesBanco } from "./banco.js";
import { env } from "./env.js";

const adapter = new PrismaMariaDb(
  montarOpcoesBanco(env.databaseUrl, env.dbAllowPublicKeyRetrieval),
);

export const prisma = new PrismaClient({ adapter });
