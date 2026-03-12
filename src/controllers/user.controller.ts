import type { Request, Response } from "express";
import { AppError } from "../shared/errors/app-error.js";
import { UserService } from "../services/user.service.js";

export class UserController {
  constructor(private readonly userService: UserService) {}

  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const user = await this.userService.getById(req.authUser.userId);
    res.json(user);
  };
}
