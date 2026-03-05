import { z } from "zod";
import type { Request, Response } from "express";
import { createCampaignSchema } from "../dtos/admin/create-campaign.dto.js";
import { AppError } from "../shared/errors/app-error.js";
import { AdminDashboardService } from "../services/admin-dashboard.service.js";

const paramsSchema = z.object({
  id: z.uuid(),
});

export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const dashboard = await this.adminDashboardService.getDashboard(req.authUser.userId);
    res.json(dashboard);
  };

  createCampaign = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const dto = createCampaignSchema.parse(req.body);
    await this.adminDashboardService.createCampaign(req.authUser.userId, dto);
    res.status(201).json({ message: "Campaign created" });
  };

  deleteCampaign = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const params = paramsSchema.parse(req.params);
    await this.adminDashboardService.deleteCampaign(req.authUser.userId, params.id);
    res.status(204).send();
  };
}
