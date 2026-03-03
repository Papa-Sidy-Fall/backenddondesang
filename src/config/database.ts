import { Pool } from "pg";
import { AppError } from "../shared/errors/app-error.js";
import { env } from "./environment.js";

function createConnectionConfig() {
  if (env.databaseUrl && env.databaseUrl.trim() !== "") {
    return {
      connectionString: env.databaseUrl,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    };
  }

  if (!env.dbHost || !env.dbPort || !env.dbUser || !env.dbPassword || !env.dbName) {
    throw new AppError(
      "Set DATABASE_URL or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME",
      500,
      "DB_CONFIGURATION_ERROR"
    );
  }

  return {
    host: env.dbHost === "localhost" ? "127.0.0.1" : env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  };
}

export const dbPool = new Pool(createConnectionConfig());
