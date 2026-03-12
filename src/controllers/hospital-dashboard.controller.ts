import { z } from "zod";
import type { Request, Response } from "express";
import { createEmergencyAlertSchema } from "../dtos/hospital/create-emergency-alert.dto.js";
import { updateAppointmentStatusSchema } from "../dtos/hospital/update-appointment-status.dto.js";
import { AppError } from "../shared/errors/app-error.js";
import { HospitalDashboardService } from "../services/hospital-dashboard.service.js";

const paramsSchema = z.object({
  id: z.uuid(),
});

export class HospitalDashboardController {
  constructor(private readonly hospitalDashboardService: HospitalDashboardService) {}

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const dashboard = await this.hospitalDashboardService.getDashboard(req.authUser.userId);
    res.json(dashboard);
  };

  updateAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const params = paramsSchema.parse(req.params);
    const dto = updateAppointmentStatusSchema.parse(req.body);

    await this.hospitalDashboardService.updateAppointmentStatus(req.authUser.userId, params.id, dto);
    res.status(204).send();
  };

  createEmergencyAlert = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const dto = createEmergencyAlertSchema.parse(req.body);
    await this.hospitalDashboardService.createEmergency(req.authUser.userId, dto);
    res.status(201).json({ message: "Emergency alert created" });
  };

  resolveEmergencyAlert = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const params = paramsSchema.parse(req.params);
    await this.hospitalDashboardService.resolveEmergency(req.authUser.userId, params.id);
    res.status(204).send();
  };
}
