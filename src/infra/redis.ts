import { env } from "../config/env.js";

const url = new URL(env.redisUrl);
const db = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0;

export const redisConnection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
  ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
  db,
  ...(url.protocol === "rediss:" ? { tls: {} } : {}),
  maxRetriesPerRequest: null,
} as const;
