import "dotenv/config";
import { createApplication } from "./app.js";
import { dbPool } from "./config/database.js";
import { env } from "./config/environment.js";

async function bootstrap(): Promise<void> {
  const { app, logger } = await createApplication();

  const server = app.listen(env.port, () => {
    logger.info("Server started", {
      port: env.port,
      nodeEnv: env.nodeEnv,
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info("Shutdown signal received", { signal });
    server.close(async () => {
      await dbPool.end();
      logger.info("HTTP server and DB pool closed", { signal });
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
