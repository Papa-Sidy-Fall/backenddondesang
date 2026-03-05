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
  phone: string | null;
  bloodType: string | null;
  city: string | null;
  district: string | null;
  birthDate: string | null;
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
  donorUserId: string;
  appointmentDate: string;
  appointmentTime: string;
  donationType: string;
  status: string;
  centerName: string;
  donorFirstName: string;
  donorLastName: string;
  donorPhone: string | null;
  donorBloodType: string | null;
  donorEmail: string;
  donorCity: string | null;
  donorDistrict: string | null;
  donorBirthDate: string | null;
}

export interface CenterRecord {
  hospitalUserId: string;
  email: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  openingHours: string;
  coordinates: string;
  defaultDistance: string;
  supportedBloodTypes: string[];
}

export interface CreateAppointmentInput {
  id: string;
  donorUserId: string;
  hospitalUserId: string;
  centerName: string;
  appointmentDate: string;
  appointmentTime: string;
  donationType: string;
  conversationId?: string | null;
}

export interface ConversationSummaryRecord {
  id: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ConversationParticipantRecord {
  conversationId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hospitalName: string | null;
}

export interface ConversationMessageRecord {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

export interface ContactRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hospitalName: string | null;
  city: string | null;
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

export interface CreateConversationInput {
  id: string;
  subject: string;
  createdByUserId: string;
  participantUserIds: string[];
}

export interface CreateConversationMessageInput {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
}

export interface UpsertManualStockInput {
  hospitalUserId: string;
  bloodType: string;
  quantity: number;
  threshold?: number;
  mode: "SET" | "ADD";
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
  listDetailedDonors(limit: number): Promise<LatestDonorRecord[]>;

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
  upsertManualStock(input: UpsertManualStockInput): Promise<void>;
  createAppointment(input: CreateAppointmentInput): Promise<void>;
  findHospitalDonors(hospitalUserId: string, limit: number): Promise<LatestDonorRecord[]>;

  listCenters(
    city: string | undefined,
    bloodType: string | undefined,
    centers: CenterRecord[]
  ): Promise<CenterRecord[]>;

  createConversation(input: CreateConversationInput): Promise<void>;
  findDirectConversation(userId: string, participantUserId: string): Promise<string | null>;
  listConversations(userId: string, limit: number): Promise<ConversationSummaryRecord[]>;
  listConversationParticipants(
    conversationIds: string[]
  ): Promise<ConversationParticipantRecord[]>;
  listConversationMessages(
    userId: string,
    conversationId: string,
    limit: number
  ): Promise<ConversationMessageRecord[]>;
  createConversationMessage(input: CreateConversationMessageInput): Promise<void>;
  listContacts(userId: string, userRole: string): Promise<ContactRecord[]>;
}
