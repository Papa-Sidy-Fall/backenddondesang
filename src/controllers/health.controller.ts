import type { Request, Response } from "express";
import type { Pool } from "pg";

export class HealthController {
  constructor(private readonly pool: Pool) {}

  root = (_req: Request, res: Response): void => {
    res.json({
      message: "🩸 API DonDeSang opérationnelle",
      version: "v1",
    });
  };

  checkDatabase = async (_req: Request, res: Response): Promise<void> => {
    await this.pool.query("SELECT 1");
    res.json({ message: "✅ Connexion PostgreSQL réussie" });
  };
}
