import cors, { type CorsOptions } from "cors";
import express, { type Express } from "express";
import { env } from "./config/environment.js";
import { dbPool } from "./config/database.js";
import { AuthController } from "./controllers/auth.controller.js";
import { HealthController } from "./controllers/health.controller.js";
import { LogController } from "./controllers/log.controller.js";
import { UserController } from "./controllers/user.controller.js";
import { errorHandlerMiddleware } from "./middlewares/error-handler.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { requestLoggerMiddleware } from "./middlewares/request-logger.middleware.js";
import { PostgresUserRepository } from "./repositories/postgres-user.repository.js";
import { createApiRouter } from "./routes/index.js";
import { AppLogger } from "./shared/logging/app-logger.js";
import { LogStore } from "./shared/logging/log-store.js";
import { AuthService } from "./services/auth.service.js";
import { DatabaseBootstrapService } from "./services/database-bootstrap.service.js";
import { GoogleOAuthService } from "./services/google-oauth.service.js";
import { PasswordHashService } from "./services/password-hash.service.js";
import { TokenService } from "./services/token.service.js";
import { UserService } from "./services/user.service.js";

export interface AppDependencies {
  app: Express;
  logger: AppLogger;
}

function isAllowedOrigin(origin: string): boolean {
  if (env.frontendUrls.includes(origin)) {
    return true;
  }

  if (origin.endsWith(".vercel.app")) {
    return true;
  }

  if (origin.startsWith("http://localhost:")) {
    return true;
  }

  return false;
}

function getCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-log-token"],
  };
}

export async function createApplication(): Promise<AppDependencies> {
  const logger = new AppLogger(new LogStore(env.logRetentionSize));
  const userRepository = new PostgresUserRepository(dbPool);

  const passwordHashService = new PasswordHashService();
  const tokenService = new TokenService();
  const authService = new AuthService(userRepository, passwordHashService, tokenService, logger);
  const userService = new UserService(userRepository);
  const googleOAuthService = new GoogleOAuthService(authService, logger);
  const dbBootstrapService = new DatabaseBootstrapService(dbPool);

  await dbBootstrapService.initialize();

  const healthController = new HealthController(dbPool);
  const authController = new AuthController(authService, googleOAuthService);
  const userController = new UserController(userService);
  const logController = new LogController(logger);

  const app = express();
  const corsOptions = getCorsOptions();

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLoggerMiddleware(logger));

  app.get("/", healthController.root);
  app.get("/test-db", healthController.checkDatabase);

  app.use(
    "/api/v1",
    createApiRouter({
      authController,
      healthController,
      userController,
      logController,
      tokenService,
    })
  );

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware(logger));

  return { app, logger };
}
