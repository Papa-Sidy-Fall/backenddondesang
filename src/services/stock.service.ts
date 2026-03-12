import type { UpsertManualStockDto } from "../dtos/stocks/upsert-manual-stock.dto.js";
import { UserRole } from "../domain/enums/user-role.enum.js";
import type { IDashboardRepository } from "../repositories/interfaces/dashboard-repository.interface.js";
import type { IUserRepository } from "../repositories/interfaces/user-repository.interface.js";
import { AppError } from "../shared/errors/app-error.js";
import {
  DEFAULT_STOCK_THRESHOLDS,
  resolveStockThreshold,
} from "../shared/constants/stock-thresholds.js";

export class StockService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly dashboardRepository: IDashboardRepository
  ) {}

  async upsertMyStock(userId: string, dto: UpsertManualStockDto): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.role !== UserRole.HOSPITAL) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    await this.dashboardRepository.upsertManualStock({
      hospitalUserId: user.id,
      bloodType: dto.groupeSanguin,
      quantity: dto.quantite,
      threshold: dto.seuil,
      mode: dto.mode,
    });
  }

  async getMyStocks(userId: string): Promise<
    Array<{
      groupeSanguin: string;
      quantite: number;
      seuil: number;
      statut: "critique" | "faible" | "normal";
    }>
  > {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.role !== UserRole.HOSPITAL) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const rawStocks = await this.dashboardRepository.getHospitalStocks(user.id);
    const byBloodType = new Map(rawStocks.map((item) => [item.bloodType, item]));

    return DEFAULT_STOCK_THRESHOLDS.map((item) => {
      const existing = byBloodType.get(item.bloodType);
      const quantity = existing?.quantity ?? 0;
      const threshold = resolveStockThreshold(item.bloodType, existing?.threshold);

      return {
        groupeSanguin: item.bloodType,
        quantite: quantity,
        seuil: threshold,
        statut: this.getStockStatus(quantity, threshold),
      };
    });
  }

  private getStockStatus(quantity: number, threshold: number): "critique" | "faible" | "normal" {
    if (quantity <= Math.max(1, Math.floor(threshold * 0.5))) {
      return "critique";
    }

    if (quantity < threshold) {
      return "faible";
    }

    return "normal";
  }
}
