import type { NextFunction, Request, Response } from "express";
import { AppError } from "../shared/errors/app-error.js";
import { TokenService } from "../services/token.service.js";

export function authMiddleware(tokenService: TokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("Missing bearer token", 401, "MISSING_TOKEN"));
    }

    const token = authHeader.slice("Bearer ".length).trim();

    if (!token) {
      return next(new AppError("Missing bearer token", 401, "MISSING_TOKEN"));
    }

    const payload = tokenService.verifyAccessToken(token);

    req.authUser = {
      userId: payload.sub,
      email: payload.email,
    };

    next();
  };
}
