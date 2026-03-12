import { randomUUID } from "node:crypto";
import { CampaignStatus } from "../domain/enums/campaign-status.enum.js";
import type { User } from "../domain/entities/user.entity.js";
import { UserRole } from "../domain/enums/user-role.enum.js";
import type { CreateCampaignDto } from "../dtos/admin/create-campaign.dto.js";
import type { AdminDashboardDto } from "../dtos/dashboard/admin-dashboard.dto.js";
import type { IDashboardRepository } from "../repositories/interfaces/dashboard-repository.interface.js";
import type { IUserRepository } from "../repositories/interfaces/user-repository.interface.js";
import { AppError } from "../shared/errors/app-error.js";
import {
  DEFAULT_STOCK_THRESHOLDS,
  resolveStockThreshold,
} from "../shared/constants/stock-thresholds.js";

const BLOOD_COLOR_MAP: Record<string, string> = {
  "O+": "bg-red-500",
  "A+": "bg-green-500",
  "B+": "bg-blue-500",
  "AB+": "bg-yellow-500",
  "O-": "bg-red-400",
  "A-": "bg-green-400",
  "B-": "bg-blue-400",
  "AB-": "bg-yellow-400",
  "N/A": "bg-gray-500",
};

export class AdminDashboardService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly dashboardRepository: IDashboardRepository
  ) {}

  async getDashboard(userId: string): Promise<AdminDashboardDto> {
    const admin = await this.requireAdmin(userId);

    const [
      roleCounts,
      donationsThisMonth,
      activeCampaigns,
      monthlyDonations,
      bloodDistribution,
      regionalUsers,
      regionalDonations,
      campaigns,
      latestDonors,
      detailedDonors,
      cntsStocksRaw,
    ] = await Promise.all([
      this.dashboardRepository.getRoleCounts(),
      this.dashboardRepository.getDonationsThisMonth(),
      this.dashboardRepository.getActiveCampaignsCount(),
      this.dashboardRepository.getMonthlyDonations(6),
      this.dashboardRepository.getBloodDistribution(),
      this.dashboardRepository.getRegionalUsers(6),
      this.dashboardRepository.getRegionalDonationsThisMonth(),
      this.dashboardRepository.listCampaigns(),
      this.dashboardRepository.listLatestDonors(5),
      this.dashboardRepository.listDetailedDonors(50),
      this.dashboardRepository.getHospitalStocks(admin.id),
    ]);

    const monthlySeries = this.buildMonthlySeries(monthlyDonations, 6);
    const repartition = this.buildBloodDistribution(bloodDistribution);

    const regionalDonationMap = new Map(regionalDonations.map((row) => [row.city, row.donations]));

    const cntsStocks = this.ensureStockShape(cntsStocksRaw).map((stock) => ({
      groupeSanguin: stock.bloodType,
      quantite: stock.quantity,
      seuil: stock.threshold,
      statut: this.getStockStatus(stock.quantity, stock.threshold),
    }));

    return {
      statistiques: {
        totalDonors: roleCounts.donors,
        donationsThisMonth,
        partnerHospitals: roleCounts.hospitals,
        activeCampaigns,
      },
      evolutionMensuelle: monthlySeries,
      repartitionGroupes: repartition,
      regions: regionalUsers.map((region) => ({
        region: region.city,
        donneurs: region.donors,
        dons: regionalDonationMap.get(region.city) ?? 0,
        centres: region.hospitals,
      })),
      campagnes: campaigns.map((campaign) => ({
        id: campaign.id,
        titre: campaign.title,
        description: campaign.description,
        dateDebut: campaign.startDate,
        dateFin: campaign.endDate,
        objectif: campaign.targetDonations,
        collecte: campaign.collectedDonations,
        statut: this.mapCampaignStatus(campaign.status),
        lieu: campaign.location,
      })),
      utilisateurs: {
        donneursActifs: roleCounts.donors,
        hopitauxPartenaires: roleCounts.hospitals,
        administrateurs: roleCounts.admins,
        derniersDonneurs: latestDonors.map((donor) => ({
          id: donor.id,
          nom: `${donor.firstName} ${donor.lastName}`.trim(),
          email: donor.email,
          cni: donor.cni ?? "-",
          telephone: donor.phone ?? "-",
          groupe: donor.bloodType ?? "-",
          date: donor.createdAt.slice(0, 10),
          ville: donor.city ?? "-",
          quartier: donor.district ?? "-",
          dateNaissance: donor.birthDate ?? "-",
        })),
        donneursDetails: detailedDonors.map((donor) => ({
          id: donor.id,
          nom: `${donor.firstName} ${donor.lastName}`.trim(),
          email: donor.email,
          cni: donor.cni ?? "-",
          telephone: donor.phone ?? "-",
          groupe: donor.bloodType ?? "-",
          date: donor.createdAt.slice(0, 10),
          ville: donor.city ?? "-",
          quartier: donor.district ?? "-",
          dateNaissance: donor.birthDate ?? "-",
        })),
      },
      cntsStocks,
    };
  }

  async createCampaign(userId: string, dto: CreateCampaignDto): Promise<void> {
    const admin = await this.requireAdmin(userId);

    const status = dto.statut ?? this.deriveCampaignStatus(dto.dateDebut);

    await this.dashboardRepository.createCampaign({
      id: randomUUID(),
      title: dto.titre,
      description: dto.description,
      startDate: dto.dateDebut,
      endDate: dto.dateFin,
      targetDonations: dto.objectif,
      status,
      location: dto.lieu,
      createdByUserId: admin.id,
    });
  }

  async deleteCampaign(userId: string, campaignId: string): Promise<void> {
    await this.requireAdmin(userId);

    const deleted = await this.dashboardRepository.deleteCampaign(campaignId);

    if (!deleted) {
      throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
    }
  }

  private async requireAdmin(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.role !== UserRole.ADMIN) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return user;
  }

  private deriveCampaignStatus(startDate: string): CampaignStatus {
    const start = new Date(startDate).getTime();
    const today = new Date().setHours(0, 0, 0, 0);

    if (!Number.isFinite(start)) {
      return CampaignStatus.ACTIVE;
    }

    return start > today ? CampaignStatus.PLANNED : CampaignStatus.ACTIVE;
  }

  private mapCampaignStatus(status: string): "active" | "terminee" | "planifiee" {
    switch (status) {
      case CampaignStatus.ACTIVE:
        return "active";
      case CampaignStatus.COMPLETED:
        return "terminee";
      default:
        return "planifiee";
    }
  }

  private buildMonthlySeries(
    monthlyDonations: Array<{ monthStart: string; total: number }>,
    months: number
  ): AdminDashboardDto["evolutionMensuelle"] {
    const byMonth = new Map(monthlyDonations.map((row) => [row.monthStart, row.total]));
    const output: AdminDashboardDto["evolutionMensuelle"] = [];

    const now = new Date();
    now.setDate(1);

    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 10);
      const dons = byMonth.get(key) ?? 0;

      output.push({
        mois: d.toLocaleDateString("fr-FR", { month: "long" }),
        dons,
        max: Math.max(10, dons + 50),
      });
    }

    return output;
  }

  private buildBloodDistribution(
    distribution: Array<{ bloodType: string; total: number }>
  ): AdminDashboardDto["repartitionGroupes"] {
    const total = distribution.reduce((acc, row) => acc + row.total, 0);

    return distribution.map((row) => ({
      groupe: row.bloodType,
      pourcentage: total > 0 ? Math.round((row.total / total) * 100) : 0,
      couleur: BLOOD_COLOR_MAP[row.bloodType] ?? "bg-gray-500",
    }));
  }

  private ensureStockShape(
    stocks: Array<{ bloodType: string; quantity: number; threshold: number }>
  ): Array<{ bloodType: string; quantity: number; threshold: number }> {
    const byBloodType = new Map(stocks.map((item) => [item.bloodType, item]));

    return DEFAULT_STOCK_THRESHOLDS.map((item) => {
      const existing = byBloodType.get(item.bloodType);
      return {
        bloodType: item.bloodType,
        quantity: existing?.quantity ?? 0,
        threshold: resolveStockThreshold(item.bloodType, existing?.threshold),
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
