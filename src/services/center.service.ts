import { randomUUID } from "node:crypto";
import { CENTER_DIRECTORY, normalizeText, type BloodType } from "../config/center-directory.js";
import type { CreateAppointmentDto } from "../dtos/appointments/create-appointment.dto.js";
import type { GetCentersQueryDto } from "../dtos/centers/get-centers-query.dto.js";
import { UserRole } from "../domain/enums/user-role.enum.js";
import type { IDashboardRepository } from "../repositories/interfaces/dashboard-repository.interface.js";
import type { IUserRepository } from "../repositories/interfaces/user-repository.interface.js";
import { AppError } from "../shared/errors/app-error.js";

interface ResolvedCenter {
  hospitalUserId: string;
  email: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  openingHours: string;
  coordinates: string;
  defaultDistance: string;
  supportedBloodTypes: BloodType[];
}

export class CenterService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly dashboardRepository: IDashboardRepository
  ) {}

  async getCenters(query: GetCentersQueryDto): Promise<
    Array<{
      hospitalUserId: string;
      nom: string;
      adresse: string;
      ville: string;
      telephone: string;
      horaires: string;
      distance: string;
      disponible: boolean;
      groupesDisponibles: string[];
      coordinates: string;
    }>
  > {
    const resolvedCenters = await this.resolveCenters();

    const city = query.city ? normalizeText(query.city) : undefined;

    const filtered = await this.dashboardRepository.listCenters(city, query.bloodType, resolvedCenters);

    return filtered.map((center) => ({
      hospitalUserId: center.hospitalUserId,
      nom: center.name,
      adresse: center.address,
      ville: center.city,
      telephone: center.phone,
      horaires: center.openingHours,
      distance: center.defaultDistance,
      disponible: true,
      groupesDisponibles: center.supportedBloodTypes,
      coordinates: center.coordinates,
    }));
  }

  async createAppointment(
    userId: string,
    dto: CreateAppointmentDto
  ): Promise<{ appointmentId: string; status: string; conversationId: string | null }> {
    const donor = await this.userRepository.findById(userId);

    if (!donor) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (donor.role !== UserRole.DONOR) {
      throw new AppError("Only donors can create appointments", 403, "FORBIDDEN");
    }

    const hospital = await this.userRepository.findById(dto.hospitalUserId);

    if (!hospital || hospital.role !== UserRole.HOSPITAL) {
      throw new AppError("Selected center is not available", 404, "CENTER_NOT_FOUND");
    }

    const centerName = hospital.hospitalName ?? `${hospital.firstName} ${hospital.lastName}`.trim();

    let conversationId = await this.dashboardRepository.findDirectConversation(donor.id, hospital.id);

    if (!conversationId) {
      conversationId = randomUUID();
      await this.dashboardRepository.createConversation({
        id: conversationId,
        subject: `RDV ${centerName}`,
        createdByUserId: donor.id,
        participantUserIds: [hospital.id],
      });
    }

    if (dto.message) {
      await this.dashboardRepository.createConversationMessage({
        id: randomUUID(),
        conversationId,
        senderUserId: donor.id,
        body: dto.message,
      });
    }

    const appointmentId = randomUUID();

    await this.dashboardRepository.createAppointment({
      id: appointmentId,
      donorUserId: donor.id,
      hospitalUserId: hospital.id,
      centerName,
      appointmentDate: dto.date,
      appointmentTime: dto.heure,
      donationType: dto.donationType,
      conversationId,
    });

    return {
      appointmentId,
      status: "PENDING",
      conversationId,
    };
  }

  private async resolveCenters(): Promise<ResolvedCenter[]> {
    const resolved = await Promise.all(
      CENTER_DIRECTORY.map(async (center) => {
        const user = await this.userRepository.findByEmail(center.email);

        if (!user || user.role !== UserRole.HOSPITAL) {
          return null;
        }

        return {
          hospitalUserId: user.id,
          email: center.email,
          name: center.hospitalName,
          city: center.city,
          address: center.address,
          phone: center.phone,
          openingHours: center.openingHours,
          coordinates: center.coordinates,
          defaultDistance: center.defaultDistance,
          supportedBloodTypes: center.supportedBloodTypes,
        };
      })
    );

    return resolved.filter((center): center is ResolvedCenter => center !== null);
  }
}
