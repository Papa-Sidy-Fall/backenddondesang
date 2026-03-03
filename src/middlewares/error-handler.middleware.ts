import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors/app-error.js";
import { AppLogger } from "../shared/logging/app-logger.js";

export function errorHandlerMiddleware(logger: AppLogger) {
  return (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (error instanceof ZodError) {
      logger.warn("Validation error", {
        requestId: req.requestId,
        issues: error.issues,
      });

      res.status(400).json({
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.issues,
      });
      return;
    }

    if (error instanceof AppError) {
      logger.warn(error.message, {
        requestId: req.requestId,
        code: error.code,
        details: error.details,
      });

      res.status(error.statusCode).json({
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return;
    }

    logger.error("Unhandled error", {
      requestId: req.requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  };
}
