import type { Request, Response } from "express";
import { AppError } from "../shared/errors/app-error.js";
import { DonorDashboardService } from "../services/donor-dashboard.service.js";

export class DonorDashboardController {
  constructor(private readonly donorDashboardService: DonorDashboardService) {}

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const dashboard = await this.donorDashboardService.getDashboard(req.authUser.userId);
    res.json(dashboard);
  };
}
