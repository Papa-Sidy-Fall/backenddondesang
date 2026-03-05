import { randomUUID } from "node:crypto";
import { AppointmentStatus } from "../domain/enums/appointment-status.enum.js";
import { EmergencyPriority } from "../domain/enums/emergency-priority.enum.js";
import type { User } from "../domain/entities/user.entity.js";
import { UserRole } from "../domain/enums/user-role.enum.js";
import type { HospitalDashboardDto } from "../dtos/dashboard/hospital-dashboard.dto.js";
import type { CreateEmergencyAlertDto } from "../dtos/hospital/create-emergency-alert.dto.js";
import type { UpdateAppointmentStatusDto } from "../dtos/hospital/update-appointment-status.dto.js";
import type { IDashboardRepository } from "../repositories/interfaces/dashboard-repository.interface.js";
import type { IUserRepository } from "../repositories/interfaces/user-repository.interface.js";
import { AppError } from "../shared/errors/app-error.js";

const DEFAULT_STOCKS = [
  { bloodType: "A+", threshold: 30 },
  { bloodType: "A-", threshold: 20 },
  { bloodType: "B+", threshold: 30 },
  { bloodType: "B-", threshold: 15 },
  { bloodType: "AB+", threshold: 20 },
  { bloodType: "AB-", threshold: 10 },
  { bloodType: "O+", threshold: 40 },
  { bloodType: "O-", threshold: 25 },
] as const;

export class HospitalDashboardService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly dashboardRepository: IDashboardRepository
  ) {}

  async getDashboard(userId: string): Promise<HospitalDashboardDto> {
    const hospitalUser = await this.requireHospital(userId);

    const [stocksRaw, appointmentsRaw, emergenciesRaw, activeDonors] = await Promise.all([
      this.dashboardRepository.getHospitalStocks(hospitalUser.id),
      this.dashboardRepository.getHospitalAppointments(hospitalUser.id, 100),
      this.dashboardRepository.listHospitalEmergencies(hospitalUser.id, 20),
      this.dashboardRepository.countActiveDonorsByCity(hospitalUser.city),
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
        donneur: `${appointment.donorFirstName} ${appointment.donorLastName}`.trim(),
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
        niveauLabel: this.getEmergencyLevelLabel(emergency.priority),
        niveauColor: this.getEmergencyLevelColor(emergency.priority),
        createdAtLabel: this.toRelativeTimeLabel(emergency.createdAt),
        notifiedDonors: emergency.notifiedDonors,
        positiveResponses: emergency.positiveResponses,
        donationsCompleted: emergency.donationsCompleted,
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

    return DEFAULT_STOCKS.map((item) => {
      const existing = byBloodType.get(item.bloodType);
      return {
        bloodType: item.bloodType,
        quantity: existing?.quantity ?? 0,
        threshold: existing?.threshold ?? item.threshold,
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
      return `Urgence ${bloodType} Négatif`;
    }

    if (priority === EmergencyPriority.HIGH) {
      return `Stock Faible ${bloodType}`;
    }

    return `Alerte ${bloodType}`;
  }

  private getEmergencyLevelLabel(priority: string): string {
    if (priority === EmergencyPriority.CRITICAL) {
      return "Critique";
    }

    if (priority === EmergencyPriority.HIGH) {
      return "Moyen";
    }

    return "Résolu";
  }

  private getEmergencyLevelColor(priority: string): "red" | "yellow" | "green" {
    if (priority === EmergencyPriority.CRITICAL) {
      return "red";
    }

    if (priority === EmergencyPriority.HIGH) {
      return "yellow";
    }

    return "green";
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
