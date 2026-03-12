import cors, { type CorsOptions } from "cors";
import express, { type Express } from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/environment.js";
import { dbPool } from "./config/database.js";
import { AdminDashboardController } from "./controllers/admin-dashboard.controller.js";
import { AuthController } from "./controllers/auth.controller.js";
import { CenterController } from "./controllers/center.controller.js";
import { DevAuthController } from "./controllers/dev-auth.controller.js";
import { DonorDashboardController } from "./controllers/donor-dashboard.controller.js";
import { HealthController } from "./controllers/health.controller.js";
import { HospitalDashboardController } from "./controllers/hospital-dashboard.controller.js";
import { LogController } from "./controllers/log.controller.js";
import { MessageController } from "./controllers/message.controller.js";
import { StockController } from "./controllers/stock.controller.js";
import { UserController } from "./controllers/user.controller.js";
import { errorHandlerMiddleware } from "./middlewares/error-handler.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { requestLoggerMiddleware } from "./middlewares/request-logger.middleware.js";
import { PostgresDashboardRepository } from "./repositories/postgres-dashboard.repository.js";
import { PostgresUserRepository } from "./repositories/postgres-user.repository.js";
import { createApiRouter } from "./routes/index.js";
import { openApiDocument } from "./docs/openapi.js";
import { AppLogger } from "./shared/logging/app-logger.js";
import { LogStore } from "./shared/logging/log-store.js";
import { AdminDashboardService } from "./services/admin-dashboard.service.js";
import { AuthService } from "./services/auth.service.js";
import { AccountSeedService } from "./services/account-seed.service.js";
import { DatabaseBootstrapService } from "./services/database-bootstrap.service.js";
import { DevAuthService } from "./services/dev-auth.service.js";
import { DonorDashboardService } from "./services/donor-dashboard.service.js";
import { GoogleOAuthService } from "./services/google-oauth.service.js";
import { HospitalDashboardService } from "./services/hospital-dashboard.service.js";
import { LegacyAdminMergeService } from "./services/legacy-admin-merge.service.js";
import { CenterService } from "./services/center.service.js";
import { MessageService } from "./services/message.service.js";
import { PasswordHashService } from "./services/password-hash.service.js";
import { StockService } from "./services/stock.service.js";
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
  const dashboardRepository = new PostgresDashboardRepository(dbPool);

  const passwordHashService = new PasswordHashService();
  const tokenService = new TokenService();
  const authService = new AuthService(userRepository, passwordHashService, tokenService, logger);
  const userService = new UserService(userRepository);
  const donorDashboardService = new DonorDashboardService(userRepository, dashboardRepository);
  const hospitalDashboardService = new HospitalDashboardService(userRepository, dashboardRepository);
  const adminDashboardService = new AdminDashboardService(userRepository, dashboardRepository);
  const centerService = new CenterService(userRepository, dashboardRepository);
  const messageService = new MessageService(userRepository, dashboardRepository);
  const stockService = new StockService(userRepository, dashboardRepository);
  const devAuthService = new DevAuthService(tokenService);
  const accountSeedService = new AccountSeedService(userRepository, passwordHashService, logger);
  const googleOAuthService = new GoogleOAuthService(authService, logger);
  const dbBootstrapService = new DatabaseBootstrapService(dbPool);
  const legacyAdminMergeService = new LegacyAdminMergeService(dbPool, userRepository, logger);

  logger.info("Initializing database schema");
  await dbBootstrapService.initialize();
  logger.info("Database schema initialized");
  await accountSeedService.ensureDefaultAccounts();
  await legacyAdminMergeService.mergeIfNeeded();

  const healthController = new HealthController(dbPool);
  const authController = new AuthController(authService, googleOAuthService);
  const userController = new UserController(userService);
  const donorDashboardController = new DonorDashboardController(donorDashboardService);
  const hospitalDashboardController = new HospitalDashboardController(hospitalDashboardService);
  const adminDashboardController = new AdminDashboardController(adminDashboardService);
  const centerController = new CenterController(centerService);
  const messageController = new MessageController(messageService);
  const stockController = new StockController(stockService);
  const devAuthController = new DevAuthController(devAuthService);
  const logController = new LogController(logger, tokenService);

  const app = express();
  const corsOptions = getCorsOptions();

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLoggerMiddleware(logger));

  app.get("/", healthController.root);
  app.get("/test-db", healthController.checkDatabase);
  app.get("/api-docs.json", (_req, res) => {
    res.json(openApiDocument);
  });
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument as any));

  app.use(
    "/api/v1",
    createApiRouter({
      authController,
      adminDashboardController,
      centerController,
      devAuthController,
      donorDashboardController,
      healthController,
      hospitalDashboardController,
      messageController,
      stockController,
      userController,
      logController,
      tokenService,
    })
  );

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware(logger));

  return { app, logger };
}
