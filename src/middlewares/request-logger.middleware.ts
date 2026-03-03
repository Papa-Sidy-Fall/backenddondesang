import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { AppLogger } from "../shared/logging/app-logger.js";

export function requestLoggerMiddleware(logger: AppLogger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = randomUUID();
    const start = Date.now();

    req.requestId = requestId;

    logger.info("Incoming request", {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });

    res.on("finish", () => {
      logger.info("Request completed", {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      });
    });

    next();
  };
}
