import type { Request, Response } from "express";
import { devLoginSchema } from "../dtos/dev/dev-login.dto.js";
import { DevAuthService } from "../services/dev-auth.service.js";

export class DevAuthController {
  constructor(private readonly devAuthService: DevAuthService) {}

  login = (req: Request, res: Response): void => {
    const dto = devLoginSchema.parse(req.body);
    const auth = this.devAuthService.login(dto);
    res.json(auth);
  };
}
