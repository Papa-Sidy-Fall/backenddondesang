import { z } from "zod";
import { AppointmentStatus } from "../../domain/enums/appointment-status.enum.js";

export const updateAppointmentStatusSchema = z.object({
  statut: z.nativeEnum(AppointmentStatus),
});

export type UpdateAppointmentStatusDto = z.infer<typeof updateAppointmentStatusSchema>;
