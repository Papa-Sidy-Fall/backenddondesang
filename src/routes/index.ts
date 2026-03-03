import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { HealthController } from "../controllers/health.controller.js";
import { LogController } from "../controllers/log.controller.js";
import { UserController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { TokenService } from "../services/token.service.js";

interface RouteDependencies {
  authController: AuthController;
  healthController: HealthController;
  userController: UserController;
  logController: LogController;
  tokenService: TokenService;
}

export function createApiRouter(dependencies: RouteDependencies): Router {
  const router = Router();

  router.get("/health", dependencies.healthController.root);
  router.get("/health/db", dependencies.healthController.checkDatabase);

  router.post("/auth/register", dependencies.authController.registerDonor);
  router.post("/auth/login", dependencies.authController.loginDonor);
  router.get("/auth/google/url", dependencies.authController.getGoogleAuthorizationUrl);
  router.get("/auth/google/callback", dependencies.authController.handleGoogleCallback);

  router.get(
    "/users/me",
    authMiddleware(dependencies.tokenService),
    dependencies.userController.getCurrentUser
  );

  router.get("/logs", dependencies.logController.getLogs);

  return router;
}
