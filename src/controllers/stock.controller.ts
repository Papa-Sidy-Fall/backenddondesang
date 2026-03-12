import type { Request, Response } from "express";
import { upsertManualStockSchema } from "../dtos/stocks/upsert-manual-stock.dto.js";
import { AppError } from "../shared/errors/app-error.js";
import { StockService } from "../services/stock.service.js";

export class StockController {
  constructor(private readonly stockService: StockService) {}

  upsertMyStock = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const dto = upsertManualStockSchema.parse(req.body);
    await this.stockService.upsertMyStock(req.authUser.userId, dto);
    res.status(204).send();
  };

  getMyStocks = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const stocks = await this.stockService.getMyStocks(req.authUser.userId);
    res.json({ stocks, total: stocks.length });
  };
}
