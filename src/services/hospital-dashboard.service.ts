import { randomUUID } from "node:crypto";
import { AppointmentStatus } from "../domain/enums/appointment-status.enum.js";
import { CampaignStatus } from "../domain/enums/campaign-status.enum.js";
import { EmergencyPriority } from "../domain/enums/emergency-priority.enum.js";
import { EmergencyStatus } from "../domain/enums/emergency-status.enum.js";
import type { User } from "../domain/entities/user.entity.js";
import { UserRole } from "../domain/enums/user-role.enum.js";
import type { HospitalDashboardDto } from "../dtos/dashboard/hospital-dashboard.dto.js";
import type { CreateEmergencyAlertDto } from "../dtos/hospital/create-emergency-alert.dto.js";
import type { UpdateAppointmentStatusDto } from "../dtos/hospital/update-appointment-status.dto.js";
import type { IDashboardRepository } from "../repositories/interfaces/dashboard-repository.interface.js";
import type { IUserRepository } from "../repositories/interfaces/user-repository.interface.js";
import { AppError } from "../shared/errors/app-error.js";
import {
  DEFAULT_STOCK_THRESHOLDS,
  resolveStockThreshold,
} from "../shared/constants/stock-thresholds.js";

export class HospitalDashboardService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly dashboardRepository: IDashboardRepository
  ) {}

  async getDashboard(userId: string): Promise<HospitalDashboardDto> {
    const hospitalUser = await this.requireHospital(userId);

    const [stocksRaw, appointmentsRaw, emergenciesRaw, activeDonors, campaigns, donors] = await Promise.all([
      this.dashboardRepository.getHospitalStocks(hospitalUser.id),
      this.dashboardRepository.getHospitalAppointments(hospitalUser.id, 100),
      this.dashboardRepository.listHospitalEmergencies(hospitalUser.id, 20),
      this.dashboardRepository.countActiveDonorsByCity(hospitalUser.city),
      this.dashboardRepository.findActiveCampaigns(12),
      this.dashboardRepository.findHospitalDonors(hospitalUser.id, 500),
    ]);

    const stocks = this.ensureStockShape(stocksRaw);
    const totalUnits = stocks.reduce((acc, stock) => acc + stock.quantity, 0);

    const today = new Date().toISOString().slice(0, 10);
    const appointmentsToday = appointmentsRaw.filter((item) => item.appointmentDate === today).length;

    const mappedStocks: HospitalDashboardDto["stocks"] = stocks.map((stock) => ({
      groupeSanguin: stock.bloodType,
      quantite: stock.quantity,
      seuil: stock.threshold,
      statut: this.getStockStatus(stock.quantity, stock.threshold),
    }));

    const criticalGroups = mappedStocks.filter((stock) => stock.statut === "critique").length;

    return {
      hospitalName:
        hospitalUser.hospitalName ?? `${hospitalUser.firstName} ${hospitalUser.lastName}`.trim(),
      summary: {
        totalUnits,
        appointmentsToday,
        criticalGroups,
        activeDonors,
      },
      stocks: mappedStocks,
      rendezvous: appointmentsRaw.map((appointment) => ({
        id: appointment.id,
        donorUserId: appointment.donorUserId,
        donneur: `${appointment.donorFirstName} ${appointment.donorLastName}`.trim(),
        email: appointment.donorEmail,
        cni: appointment.donorCni ?? "-",
        telephone: appointment.donorPhone ?? "-",
        groupeSanguin: appointment.donorBloodType ?? "-",
        date: appointment.appointmentDate,
        heure: appointment.appointmentTime,
        statut: this.mapAppointmentStatus(appointment.status),
      })),
      urgences: emergenciesRaw.map((emergency) => ({
        id: emergency.id,
        titre: this.buildEmergencyTitle(emergency.priority, emergency.bloodType),
        description: emergency.message,
        niveauLabel: this.getEmergencyLevelLabel(emergency.status, emergency.priority),
        niveauColor: this.getEmergencyLevelColor(emergency.status, emergency.priority),
        statut: this.mapEmergencyStatus(emergency.status),
        createdAtLabel: this.toRelativeTimeLabel(emergency.createdAt),
        notifiedDonors: emergency.notifiedDonors,
        positiveResponses: emergency.positiveResponses,
        donationsCompleted: emergency.donationsCompleted,
      })),
      donneurs: donors.map((donor) => ({
        id: donor.id,
        nom: `${donor.firstName} ${donor.lastName}`.trim(),
        email: donor.email,
        cni: donor.cni ?? "-",
        telephone: donor.phone ?? "-",
        groupeSanguin: donor.bloodType ?? "-",
        ville: donor.city ?? "-",
        quartier: donor.district ?? "-",
        dateNaissance: donor.birthDate ?? "-",
        inscritLe: donor.createdAt.slice(0, 10),
      })),
      campagnes: campaigns.map((campaign) => ({
        id: campaign.id,
        titre: campaign.title,
        description: campaign.description,
        dateDebut: campaign.startDate,
        dateFin: campaign.endDate,
        lieu: campaign.location,
        statut: this.mapCampaignStatus(campaign.status),
      })),
    };
  }

  async updateAppointmentStatus(
    userId: string,
    appointmentId: string,
    dto: UpdateAppointmentStatusDto
  ): Promise<void> {
    const hospitalUser = await this.requireHospital(userId);

    const updated = await this.dashboardRepository.updateHospitalAppointmentStatus(
      hospitalUser.id,
      appointmentId,
      dto.statut
    );

    if (!updated) {
      throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
    }
  }

  async createEmergency(userId: string, dto: CreateEmergencyAlertDto): Promise<void> {
    const hospitalUser = await this.requireHospital(userId);

    const notifiedDonors = await this.dashboardRepository.countCompatibleDonors(
      hospitalUser.city,
      dto.groupeSanguin
    );

    await this.dashboardRepository.createEmergencyAlert({
      id: randomUUID(),
      hospitalUserId: hospitalUser.id,
      bloodType: dto.groupeSanguin,
      quantityNeeded: dto.quantite,
      message: dto.message,
      priority: dto.priorite ?? EmergencyPriority.HIGH,
      notifiedDonors,
    });
  }

  async resolveEmergency(userId: string, emergencyId: string): Promise<void> {
    const hospitalUser = await this.requireHospital(userId);

    const updated = await this.dashboardRepository.resolveEmergencyAlert(
      hospitalUser.id,
      emergencyId,
      EmergencyStatus.RESOLVED
    );

    if (!updated) {
      throw new AppError("Emergency not found", 404, "EMERGENCY_NOT_FOUND");
    }
  }

  private async requireHospital(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.role !== UserRole.HOSPITAL) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return user;
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

  private mapAppointmentStatus(status: string): "en-attente" | "confirme" | "termine" | "annule" {
    switch (status) {
      case AppointmentStatus.PENDING:
        return "en-attente";
      case AppointmentStatus.CONFIRMED:
        return "confirme";
      case AppointmentStatus.COMPLETED:
        return "termine";
      case AppointmentStatus.CANCELLED:
        return "annule";
      default:
        return "en-attente";
    }
  }

  private buildEmergencyTitle(priority: string, bloodType: string): string {
    if (priority === EmergencyPriority.CRITICAL) {
      return `Urgence ${bloodType}`;
    }

    if (priority === EmergencyPriority.HIGH) {
      return `Stock faible ${bloodType}`;
    }

    return `Alerte ${bloodType}`;
  }

  private getEmergencyLevelLabel(status: string, priority: string): string {
    if (status === EmergencyStatus.RESOLVED) {
      return "Resolue";
    }

    if (priority === EmergencyPriority.CRITICAL) {
      return "Critique";
    }

    if (priority === EmergencyPriority.HIGH) {
      return "Urgente";
    }

    return "Active";
  }

  private getEmergencyLevelColor(status: string, priority: string): "red" | "yellow" | "green" {
    if (status === EmergencyStatus.RESOLVED) {
      return "green";
    }

    if (priority === EmergencyPriority.CRITICAL) {
      return "red";
    }

    if (priority === EmergencyPriority.HIGH || priority === EmergencyPriority.MEDIUM) {
      return "yellow";
    }

    return "yellow";
  }

  private mapEmergencyStatus(status: string): "active" | "resolue" {
    return status === EmergencyStatus.RESOLVED ? "resolue" : "active";
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

  private toRelativeTimeLabel(iso: string): string {
    const createdAt = new Date(iso).getTime();
    if (Number.isNaN(createdAt)) {
      return "Date inconnue";
    }

    const diffMs = Date.now() - createdAt;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return "Il y a quelques minutes";
    }

    if (diffHours < 24) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
    }

    return "Hier";
  }
}
