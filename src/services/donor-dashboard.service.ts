import type { User } from "../domain/entities/user.entity.js";
import { UserRole } from "../domain/enums/user-role.enum.js";
import type { DonorDashboardDto } from "../dtos/dashboard/donor-dashboard.dto.js";
import type { IDashboardRepository } from "../repositories/interfaces/dashboard-repository.interface.js";
import type { IUserRepository } from "../repositories/interfaces/user-repository.interface.js";
import { AppError } from "../shared/errors/app-error.js";

export class DonorDashboardService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly dashboardRepository: IDashboardRepository
  ) {}

  async getDashboard(userId: string): Promise<DonorDashboardDto> {
    const user = await this.requireDonor(userId);

    const [stats, lastDonationDate, history, upcoming, urgencies, campaigns] = await Promise.all([
      this.dashboardRepository.getDonorDonationStats(user.id),
      this.dashboardRepository.getDonorLastDonationDate(user.id),
      this.dashboardRepository.findDonorDonationHistory(user.id, 12),
      this.dashboardRepository.findDonorUpcomingAppointments(user.id, 6),
      this.dashboardRepository.findActiveEmergencies(5, user.city),
      this.dashboardRepository.findActiveCampaigns(6),
    ]);

    const totalDonations = stats.totalDonations;
    const livesSaved = totalDonations * 3;

    const nextPossibleDate = this.computeNextDonationDate(lastDonationDate);
    const address = [user.district, user.city].filter(Boolean).join(", ") || "Adresse non renseignée";

    return {
      profile: {
        id: user.id,
        nom: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        telephone: user.phone ?? "Non renseigné",
        groupeSanguin: user.bloodType ?? "Non renseigné",
        dateNaissance: user.birthDate ?? "Non renseignée",
        adresse: address,
        dernierDon: lastDonationDate,
        prochainDonPossible: nextPossibleDate,
        totalDons: totalDonations,
        viesSauvees: livesSaved,
      },
      historiqueDons: history.map((donation) => ({
        id: donation.id,
        date: donation.donationDate,
        centre: donation.centerName,
        type: donation.donationType,
        statut: this.mapDonationStatus(donation.status),
      })),
      prochainsRendezVous: upcoming.map((appointment) => ({
        id: appointment.id,
        date: appointment.appointmentDate,
        heure: appointment.appointmentTime,
        centre: appointment.centerName,
        type: appointment.donationType,
        statut: this.mapAppointmentStatus(appointment.status),
      })),
      badges: this.buildBadges(totalDonations),
      urgences: urgencies.map((emergency) => ({
        id: emergency.id,
        hopital: emergency.hospitalName,
        groupe: emergency.bloodType,
        besoin: this.mapEmergencyNeed(emergency.priority),
        distance: emergency.city
          ? user.city && emergency.city === user.city
            ? "Dans votre ville"
            : `Ville: ${emergency.city}`
          : "Distance inconnue",
      })),
      campagnes: campaigns.map((campaign) => ({
        id: campaign.id,
        titre: campaign.title,
        date: campaign.startDate,
        lieu: campaign.location,
      })),
    };
  }

  private async requireDonor(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.role !== UserRole.DONOR) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return user;
  }

  private computeNextDonationDate(lastDonationDate: string | null): string | null {
    if (!lastDonationDate) {
      return null;
    }

    const date = new Date(lastDonationDate);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    date.setDate(date.getDate() + 90);
    return date.toISOString().slice(0, 10);
  }

  private mapDonationStatus(status: string): string {
    if (status === "COMPLETED") {
      return "Complété";
    }

    if (status === "CANCELLED") {
      return "Annulé";
    }

    return status;
  }

  private mapAppointmentStatus(status: string): string {
    switch (status) {
      case "PENDING":
        return "En attente";
      case "CONFIRMED":
        return "Confirmé";
      case "COMPLETED":
        return "Terminé";
      case "CANCELLED":
        return "Annulé";
      default:
        return status;
    }
  }

  private mapEmergencyNeed(priority: string): string {
    switch (priority) {
      case "CRITICAL":
        return "Critique";
      case "HIGH":
        return "Urgent";
      default:
        return "Actif";
    }
  }

  private buildBadges(totalDonations: number): DonorDashboardDto["badges"] {
    return [
      { nom: "Premier Don", icon: "🩸", obtenu: totalDonations >= 1 },
      { nom: "5 Dons", icon: "⭐", obtenu: totalDonations >= 5 },
      { nom: "10 Dons", icon: "🏆", obtenu: totalDonations >= 10 },
      { nom: "Donneur Régulier", icon: "💪", obtenu: totalDonations >= 12 },
      { nom: "20 Dons", icon: "🎖️", obtenu: totalDonations >= 20 },
      { nom: "Héros du Sang", icon: "👑", obtenu: totalDonations >= 30 },
    ];
  }
}
