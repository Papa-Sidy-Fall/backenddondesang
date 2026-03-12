import type { Request, Response } from "express";
import { createAppointmentSchema } from "../dtos/appointments/create-appointment.dto.js";
import { getCentersQuerySchema } from "../dtos/centers/get-centers-query.dto.js";
import { AppError } from "../shared/errors/app-error.js";
import { CenterService } from "../services/center.service.js";

export class CenterController {
  constructor(private readonly centerService: CenterService) {}

  getCenters = async (req: Request, res: Response): Promise<void> => {
    const query = getCentersQuerySchema.parse(req.query);
    const centers = await this.centerService.getCenters(query);
    res.json({ centers, total: centers.length });
  };

  createAppointment = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const dto = createAppointmentSchema.parse(req.body);
    const created = await this.centerService.createAppointment(req.authUser.userId, dto);
    res.status(201).json(created);
  };
}
