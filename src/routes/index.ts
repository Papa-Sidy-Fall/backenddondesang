import { Router } from "express";
import { AdminDashboardController } from "../controllers/admin-dashboard.controller.js";
import { AuthController } from "../controllers/auth.controller.js";
import { CenterController } from "../controllers/center.controller.js";
import { DevAuthController } from "../controllers/dev-auth.controller.js";
import { DonorDashboardController } from "../controllers/donor-dashboard.controller.js";
import { HealthController } from "../controllers/health.controller.js";
import { HospitalDashboardController } from "../controllers/hospital-dashboard.controller.js";
import { LogController } from "../controllers/log.controller.js";
import { MessageController } from "../controllers/message.controller.js";
import { StockController } from "../controllers/stock.controller.js";
import { UserController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { TokenService } from "../services/token.service.js";

interface RouteDependencies {
  adminDashboardController: AdminDashboardController;
  authController: AuthController;
  centerController: CenterController;
  devAuthController: DevAuthController;
  donorDashboardController: DonorDashboardController;
  healthController: HealthController;
  hospitalDashboardController: HospitalDashboardController;
  userController: UserController;
  logController: LogController;
  messageController: MessageController;
  stockController: StockController;
  tokenService: TokenService;
}

export function createApiRouter(dependencies: RouteDependencies): Router {
  const router = Router();

  router.get("/health", dependencies.healthController.root);
  router.get("/health/db", dependencies.healthController.checkDatabase);
  router.get("/centers", dependencies.centerController.getCenters);

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

  router.post(
    "/appointments",
    authMiddleware(dependencies.tokenService),
    dependencies.centerController.createAppointment
  );

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

  router.patch(
    "/hospital/emergencies/:id/resolve",
    authMiddleware(dependencies.tokenService),
    dependencies.hospitalDashboardController.resolveEmergencyAlert
  );

  router.get(
    "/dashboards/cnts",
    authMiddleware(dependencies.tokenService),
    dependencies.adminDashboardController.getDashboard
  );

  router.get(
    "/dashboards/admin",
    authMiddleware(dependencies.tokenService),
    dependencies.adminDashboardController.getDashboard
  );

  router.get(
    "/messages/conversations",
    authMiddleware(dependencies.tokenService),
    dependencies.messageController.listConversations
  );

  router.get(
    "/messages/contacts",
    authMiddleware(dependencies.tokenService),
    dependencies.messageController.listContacts
  );

  router.get(
    "/messages/conversations/:id/messages",
    authMiddleware(dependencies.tokenService),
    dependencies.messageController.listMessages
  );

  router.post(
    "/messages/conversations",
    authMiddleware(dependencies.tokenService),
    dependencies.messageController.createConversation
  );

  router.post(
    "/messages/conversations/:id/messages",
    authMiddleware(dependencies.tokenService),
    dependencies.messageController.sendMessage
  );

  router.get(
    "/stocks/me",
    authMiddleware(dependencies.tokenService),
    dependencies.stockController.getMyStocks
  );

  router.post(
    "/stocks/manual",
    authMiddleware(dependencies.tokenService),
    dependencies.stockController.upsertMyStock
  );

  router.post(
    "/cnts/campaigns",
    authMiddleware(dependencies.tokenService),
    dependencies.adminDashboardController.createCampaign
  );

  router.post(
    "/admin/campaigns",
    authMiddleware(dependencies.tokenService),
    dependencies.adminDashboardController.createCampaign
  );

  router.delete(
    "/cnts/campaigns/:id",
    authMiddleware(dependencies.tokenService),
    dependencies.adminDashboardController.deleteCampaign
  );

  router.delete(
    "/admin/campaigns/:id",
    authMiddleware(dependencies.tokenService),
    dependencies.adminDashboardController.deleteCampaign
  );

  router.get("/logs", dependencies.logController.getLogs);

  return router;
}
