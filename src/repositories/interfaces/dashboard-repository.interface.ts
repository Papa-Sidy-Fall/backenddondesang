import type { AppointmentStatus } from "../../domain/enums/appointment-status.enum.js";
import type { CampaignStatus } from "../../domain/enums/campaign-status.enum.js";
import type { EmergencyPriority } from "../../domain/enums/emergency-priority.enum.js";

export interface DonationHistoryRecord {
  id: string;
  donationDate: string;
  centerName: string;
  donationType: string;
  status: string;
}

export interface UpcomingAppointmentRecord {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  centerName: string;
  donationType: string;
  status: string;
}

export interface EmergencyRecord {
  id: string;
  bloodType: string;
  priority: string;
  message: string;
  createdAt: string;
  quantityNeeded: number;
  hospitalName: string;
  city: string | null;
  notifiedDonors: number;
  positiveResponses: number;
  donationsCompleted: number;
}

export interface CampaignRecord {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  targetDonations: number;
  collectedDonations: number;
  status: string;
  location: string;
  createdAt: string;
}

export interface RoleCountsRecord {
  donors: number;
  hospitals: number;
  admins: number;
}

export interface MonthlyDonationRecord {
  monthStart: string;
  total: number;
}

export interface BloodDistributionRecord {
  bloodType: string;
  total: number;
}

export interface RegionalUsersRecord {
  city: string;
  donors: number;
  hospitals: number;
}

export interface RegionalDonationsRecord {
  city: string;
  donations: number;
}

export interface LatestDonorRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bloodType: string | null;
  city: string | null;
  createdAt: string;
}

export interface StockRecord {
  id: string;
  bloodType: string;
  quantity: number;
  threshold: number;
  updatedAt: string;
}

export interface HospitalAppointmentRecord {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  donationType: string;
  status: string;
  centerName: string;
  donorFirstName: string;
  donorLastName: string;
  donorPhone: string | null;
  donorBloodType: string | null;
}

export interface CreateCampaignInput {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  targetDonations: number;
  status: CampaignStatus;
  location: string;
  createdByUserId: string;
}

export interface CreateEmergencyInput {
  id: string;
  hospitalUserId: string;
  bloodType: string;
  quantityNeeded: number;
  message: string;
  priority: EmergencyPriority;
  notifiedDonors: number;
}

export interface IDashboardRepository {
  findDonorDonationHistory(userId: string, limit: number): Promise<DonationHistoryRecord[]>;
  findDonorUpcomingAppointments(userId: string, limit: number): Promise<UpcomingAppointmentRecord[]>;
  findActiveEmergencies(limit: number, donorCity?: string | null): Promise<EmergencyRecord[]>;
  findActiveCampaigns(limit: number): Promise<CampaignRecord[]>;
  getDonorDonationStats(userId: string): Promise<{ totalDonations: number; totalUnits: number }>;
  getDonorLastDonationDate(userId: string): Promise<string | null>;

  getRoleCounts(): Promise<RoleCountsRecord>;
  getDonationsThisMonth(): Promise<number>;
  getActiveCampaignsCount(): Promise<number>;
  getMonthlyDonations(months: number): Promise<MonthlyDonationRecord[]>;
  getBloodDistribution(): Promise<BloodDistributionRecord[]>;
  getRegionalUsers(limit: number): Promise<RegionalUsersRecord[]>;
  getRegionalDonationsThisMonth(): Promise<RegionalDonationsRecord[]>;
  listCampaigns(): Promise<CampaignRecord[]>;
  createCampaign(input: CreateCampaignInput): Promise<CampaignRecord>;
  deleteCampaign(campaignId: string): Promise<boolean>;
  listLatestDonors(limit: number): Promise<LatestDonorRecord[]>;

  getHospitalStocks(hospitalUserId: string): Promise<StockRecord[]>;
  getHospitalAppointments(hospitalUserId: string, limit: number): Promise<HospitalAppointmentRecord[]>;
  updateHospitalAppointmentStatus(
    hospitalUserId: string,
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<boolean>;
  listHospitalEmergencies(hospitalUserId: string, limit: number): Promise<EmergencyRecord[]>;
  createEmergencyAlert(input: CreateEmergencyInput): Promise<EmergencyRecord>;
  countActiveDonorsByCity(city: string | null): Promise<number>;
  countCompatibleDonors(city: string | null, bloodType: string): Promise<number>;
}
