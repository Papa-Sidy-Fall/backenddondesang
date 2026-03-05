import { Router } from "express";
import { AdminDashboardController } from "../controllers/admin-dashboard.controller.js";
import { AuthController } from "../controllers/auth.controller.js";
import { DevAuthController } from "../controllers/dev-auth.controller.js";
import { DonorDashboardController } from "../controllers/donor-dashboard.controller.js";
import { HealthController } from "../controllers/health.controller.js";
import { HospitalDashboardController } from "../controllers/hospital-dashboard.controller.js";
import { LogController } from "../controllers/log.controller.js";
import { UserController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { TokenService } from "../services/token.service.js";

interface RouteDependencies {
  adminDashboardController: AdminDashboardController;
  authController: AuthController;
  devAuthController: DevAuthController;
  donorDashboardController: DonorDashboardController;
  healthController: HealthController;
  hospitalDashboardController: HospitalDashboardController;
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
  router.post("/dev-auth/login", dependencies.devAuthController.login);
  router.post(
    "/auth/change-password",
    authMiddleware(dependencies.tokenService),
    dependencies.authController.changePassword
  );
  router.get("/auth/google/url", dependencies.authController.getGoogleAuthorizationUrl);
  router.get("/auth/google/callback", dependencies.authController.handleGoogleCallback);

  router.get(
    "/users/me",
    authMiddleware(dependencies.tokenService),
    dependencies.userController.getCurrentUser
  );

  router.get(
    "/dashboards/donor",
    authMiddleware(dependencies.tokenService),
    dependencies.donorDashboardController.getDashboard
  );

  router.get(
    "/dashboards/hospital",
    authMiddleware(dependencies.tokenService),
    dependencies.hospitalDashboardController.getDashboard
  );

  router.patch(
    "/hospital/appointments/:id/status",
    authMiddleware(dependencies.tokenService),
    dependencies.hospitalDashboardController.updateAppointmentStatus
  );

  router.post(
    "/hospital/emergencies",
    authMiddleware(dependencies.tokenService),
    dependencies.hospitalDashboardController.createEmergencyAlert
  );

  router.get(
    "/dashboards/admin",
    authMiddleware(dependencies.tokenService),
    dependencies.adminDashboardController.getDashboard
  );

  router.post(
    "/admin/campaigns",
    authMiddleware(dependencies.tokenService),
    dependencies.adminDashboardController.createCampaign
  );

  router.delete(
    "/admin/campaigns/:id",
    authMiddleware(dependencies.tokenService),
    dependencies.adminDashboardController.deleteCampaign
  );

  router.get("/logs", dependencies.logController.getLogs);

  return router;
}
