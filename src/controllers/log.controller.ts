import type { Request, Response } from "express";
import { env } from "../config/environment.js";
import { getLogsQuerySchema } from "../dtos/logs/get-logs-query.dto.js";
import { AppError } from "../shared/errors/app-error.js";
import { AppLogger } from "../shared/logging/app-logger.js";
import { TokenService } from "../services/token.service.js";

export class LogController {
  constructor(
    private readonly logger: AppLogger,
    private readonly tokenService: TokenService
  ) {}

  getLogs = (req: Request, res: Response): void => {
    this.authorize(req);

    const query = getLogsQuerySchema.parse(req.query);
    const logs = this.logger.getLogs({
      level: query.level,
      limit: query.limit,
      search: query.search,
    });

    res.json({
      total: logs.length,
      logs,
    });
  };

  private authorize(req: Request): void {
    if (env.nodeEnv !== "production") {
      return;
    }

    if (this.hasValidDevBearerToken(req)) {
      return;
    }

    const tokenFromHeader = req.headers["x-log-token"];

    if (!env.devLogToken) {
      throw new AppError(
        "Logs endpoint is disabled in production (DEV_LOG_TOKEN missing)",
        403,
        "LOGS_DISABLED"
      );
    }

    if (typeof tokenFromHeader !== "string" || tokenFromHeader !== env.devLogToken) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  }

  private hasValidDevBearerToken(req: Request): boolean {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return false;
    }

    try {
      const payload = this.tokenService.verifyAccessToken(token);
      return (
        payload.sub === "dev-logs" &&
        payload.email.toLowerCase() === env.devLogs.email.trim().toLowerCase()
      );
    } catch {
      return false;
    }
  }
}
