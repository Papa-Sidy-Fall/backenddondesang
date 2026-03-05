import type { Pool } from "pg";
import type { AppointmentStatus } from "../domain/enums/appointment-status.enum.js";
import type {
  BloodDistributionRecord,
  CampaignRecord,
  CreateCampaignInput,
  CreateEmergencyInput,
  DonationHistoryRecord,
  EmergencyRecord,
  HospitalAppointmentRecord,
  IDashboardRepository,
  LatestDonorRecord,
  MonthlyDonationRecord,
  RegionalDonationsRecord,
  RegionalUsersRecord,
  RoleCountsRecord,
  StockRecord,
  UpcomingAppointmentRecord,
} from "./interfaces/dashboard-repository.interface.js";

interface DonationHistoryRow {
  id: string;
  donation_date: string;
  center_name: string;
  donation_type: string;
  status: string;
}

interface UpcomingAppointmentRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  center_name: string;
  donation_type: string;
  status: string;
}

interface EmergencyRow {
  id: string;
  blood_type: string;
  priority: string;
  message: string;
  created_at: Date;
  quantity_needed: number;
  notified_donors: number;
  positive_responses: number;
  donations_completed: number;
  hospital_name: string | null;
  first_name: string;
  last_name: string;
  city: string | null;
}

interface CampaignRow {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  target_donations: number;
  collected_donations: number;
  status: string;
  location: string;
  created_at: Date;
}

interface RoleCountsRow {
  donors: number;
  hospitals: number;
  admins: number;
}

interface CountRow {
  total: number;
}

interface MonthlyDonationRow {
  month_start: string;
  total: number;
}

interface BloodDistributionRow {
  blood_type: string;
  total: number;
}

interface RegionalUsersRow {
  city: string;
  donors: number;
  hospitals: number;
}

interface RegionalDonationsRow {
  city: string;
  donations: number;
}

interface LatestDonorRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  blood_type: string | null;
  city: string | null;
  created_at: Date;
}

interface StockRow {
  id: string;
  blood_type: string;
  quantity: number;
  threshold: number;
  updated_at: Date;
}

interface HospitalAppointmentRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  donation_type: string;
  status: string;
  center_name: string;
  donor_first_name: string;
  donor_last_name: string;
  donor_phone: string | null;
  donor_blood_type: string | null;
}

export class PostgresDashboardRepository implements IDashboardRepository {
  constructor(private readonly pool: Pool) {}

  async findDonorDonationHistory(userId: string, limit: number): Promise<DonationHistoryRecord[]> {
    const result = await this.pool.query<DonationHistoryRow>(
      `
      SELECT id, donation_date, center_name, donation_type, status
      FROM donations
      WHERE donor_user_id = $1
      ORDER BY donation_date DESC, created_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      donationDate: row.donation_date,
      centerName: row.center_name,
      donationType: row.donation_type,
      status: row.status,
    }));
  }

  async findDonorUpcomingAppointments(
    userId: string,
    limit: number
  ): Promise<UpcomingAppointmentRecord[]> {
    const result = await this.pool.query<UpcomingAppointmentRow>(
      `
      SELECT id, appointment_date, appointment_time, center_name, donation_type, status
      FROM appointments
      WHERE donor_user_id = $1
        AND appointment_date >= CURRENT_DATE
        AND status IN ('PENDING', 'CONFIRMED')
      ORDER BY appointment_date ASC, appointment_time ASC
      LIMIT $2
      `,
      [userId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      appointmentDate: row.appointment_date,
      appointmentTime: row.appointment_time,
      centerName: row.center_name,
      donationType: row.donation_type,
      status: row.status,
    }));
  }

  async findActiveEmergencies(limit: number, donorCity?: string | null): Promise<EmergencyRecord[]> {
    const result = await this.pool.query<EmergencyRow>(
      `
      SELECT
        e.id,
        e.blood_type,
        e.priority,
        e.message,
        e.created_at,
        e.quantity_needed,
        e.notified_donors,
        e.positive_responses,
        e.donations_completed,
        u.hospital_name,
        u.first_name,
        u.last_name,
        u.city
      FROM emergency_alerts e
      INNER JOIN users u ON u.id = e.hospital_user_id
      WHERE e.status = 'ACTIVE'
      ORDER BY
        CASE WHEN $2::text IS NOT NULL AND u.city = $2 THEN 0 ELSE 1 END,
        e.created_at DESC
      LIMIT $1
      `,
      [limit, donorCity ?? null]
    );

    return result.rows.map((row) => ({
      id: row.id,
      bloodType: row.blood_type,
      priority: row.priority,
      message: row.message,
      createdAt: row.created_at.toISOString(),
      quantityNeeded: row.quantity_needed,
      notifiedDonors: row.notified_donors,
      positiveResponses: row.positive_responses,
      donationsCompleted: row.donations_completed,
      hospitalName: row.hospital_name ?? `${row.first_name} ${row.last_name}`,
      city: row.city,
    }));
  }

  async findActiveCampaigns(limit: number): Promise<CampaignRecord[]> {
    const result = await this.pool.query<CampaignRow>(
      `
      SELECT *
      FROM campaigns
      WHERE status IN ('ACTIVE', 'PLANNED')
      ORDER BY start_date ASC
      LIMIT $1
      `,
      [limit]
    );

    return result.rows.map((row) => this.mapCampaignRow(row));
  }

  async getDonorDonationStats(userId: string): Promise<{ totalDonations: number; totalUnits: number }> {
    const result = await this.pool.query<{ total_donations: number; total_units: number }>(
      `
      SELECT
        COUNT(*)::int AS total_donations,
        COALESCE(SUM(units), 0)::int AS total_units
      FROM donations
      WHERE donor_user_id = $1
        AND status = 'COMPLETED'
      `,
      [userId]
    );

    const row = result.rows[0] ?? { total_donations: 0, total_units: 0 };
    return {
      totalDonations: row.total_donations,
      totalUnits: row.total_units,
    };
  }

  async getDonorLastDonationDate(userId: string): Promise<string | null> {
    const result = await this.pool.query<{ donation_date: string }>(
      `
      SELECT donation_date
      FROM donations
      WHERE donor_user_id = $1
        AND status = 'COMPLETED'
      ORDER BY donation_date DESC
      LIMIT 1
      `,
      [userId]
    );

    return (result.rowCount ?? 0) > 0 ? result.rows[0].donation_date : null;
  }

  async getRoleCounts(): Promise<RoleCountsRecord> {
    const result = await this.pool.query<RoleCountsRow>(
      `
      SELECT
        SUM(CASE WHEN role = 'DONOR' THEN 1 ELSE 0 END)::int AS donors,
        SUM(CASE WHEN role = 'HOSPITAL' THEN 1 ELSE 0 END)::int AS hospitals,
        SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END)::int AS admins
      FROM users
      `
    );

    return result.rows[0] ?? { donors: 0, hospitals: 0, admins: 0 };
  }

  async getDonationsThisMonth(): Promise<number> {
    const result = await this.pool.query<CountRow>(
      `
      SELECT COUNT(*)::int AS total
      FROM donations
      WHERE status = 'COMPLETED'
        AND date_trunc('month', donation_date) = date_trunc('month', CURRENT_DATE)
      `
    );

    return result.rows[0]?.total ?? 0;
  }

  async getActiveCampaignsCount(): Promise<number> {
    const result = await this.pool.query<CountRow>(
      `SELECT COUNT(*)::int AS total FROM campaigns WHERE status = 'ACTIVE'`
    );
    return result.rows[0]?.total ?? 0;
  }

  async getMonthlyDonations(months: number): Promise<MonthlyDonationRecord[]> {
    const result = await this.pool.query<MonthlyDonationRow>(
      `
      SELECT
        to_char(date_trunc('month', donation_date), 'YYYY-MM-01') AS month_start,
        COUNT(*)::int AS total
      FROM donations
      WHERE donation_date >= date_trunc('month', CURRENT_DATE) - (($1::int - 1) * interval '1 month')
        AND status = 'COMPLETED'
      GROUP BY 1
      ORDER BY 1
      `,
      [months]
    );

    return result.rows.map((row) => ({
      monthStart: row.month_start,
      total: row.total,
    }));
  }

  async getBloodDistribution(): Promise<BloodDistributionRecord[]> {
    const result = await this.pool.query<BloodDistributionRow>(
      `
      SELECT
        COALESCE(NULLIF(blood_type, ''), 'N/A') AS blood_type,
        COUNT(*)::int AS total
      FROM users
      WHERE role = 'DONOR'
      GROUP BY 1
      ORDER BY total DESC
      `
    );

    return result.rows.map((row) => ({
      bloodType: row.blood_type,
      total: row.total,
    }));
  }

  async getRegionalUsers(limit: number): Promise<RegionalUsersRecord[]> {
    const result = await this.pool.query<RegionalUsersRow>(
      `
      SELECT
        COALESCE(NULLIF(city, ''), 'Non renseignée') AS city,
        SUM(CASE WHEN role = 'DONOR' THEN 1 ELSE 0 END)::int AS donors,
        SUM(CASE WHEN role = 'HOSPITAL' THEN 1 ELSE 0 END)::int AS hospitals
      FROM users
      GROUP BY 1
      ORDER BY donors DESC, city ASC
      LIMIT $1
      `,
      [limit]
    );

    return result.rows.map((row) => ({
      city: row.city,
      donors: row.donors,
      hospitals: row.hospitals,
    }));
  }

  async getRegionalDonationsThisMonth(): Promise<RegionalDonationsRecord[]> {
    const result = await this.pool.query<RegionalDonationsRow>(
      `
      SELECT
        COALESCE(NULLIF(u.city, ''), 'Non renseignée') AS city,
        COUNT(d.id)::int AS donations
      FROM donations d
      INNER JOIN users u ON u.id = d.donor_user_id
      WHERE d.status = 'COMPLETED'
        AND date_trunc('month', d.donation_date) = date_trunc('month', CURRENT_DATE)
      GROUP BY 1
      `
    );

    return result.rows.map((row) => ({
      city: row.city,
      donations: row.donations,
    }));
  }

  async listCampaigns(): Promise<CampaignRecord[]> {
    const result = await this.pool.query<CampaignRow>(
      `SELECT * FROM campaigns ORDER BY created_at DESC, start_date DESC`
    );

    return result.rows.map((row) => this.mapCampaignRow(row));
  }

  async createCampaign(input: CreateCampaignInput): Promise<CampaignRecord> {
    const result = await this.pool.query<CampaignRow>(
      `
      INSERT INTO campaigns (
        id,
        title,
        description,
        start_date,
        end_date,
        target_donations,
        collected_donations,
        status,
        location,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4::date, $5::date, $6, 0, $7, $8, $9)
      RETURNING *
      `,
      [
        input.id,
        input.title,
        input.description,
        input.startDate,
        input.endDate,
        input.targetDonations,
        input.status,
        input.location,
        input.createdByUserId,
      ]
    );

    return this.mapCampaignRow(result.rows[0]);
  }

  async deleteCampaign(campaignId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM campaigns WHERE id = $1`,
      [campaignId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async listLatestDonors(limit: number): Promise<LatestDonorRecord[]> {
    const result = await this.pool.query<LatestDonorRow>(
      `
      SELECT id, first_name, last_name, email, blood_type, city, created_at
      FROM users
      WHERE role = 'DONOR'
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      bloodType: row.blood_type,
      city: row.city,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async getHospitalStocks(hospitalUserId: string): Promise<StockRecord[]> {
    const result = await this.pool.query<StockRow>(
      `
      SELECT id, blood_type, quantity, threshold, updated_at
      FROM hospital_stocks
      WHERE hospital_user_id = $1
      ORDER BY blood_type ASC
      `,
      [hospitalUserId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      bloodType: row.blood_type,
      quantity: row.quantity,
      threshold: row.threshold,
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async getHospitalAppointments(
    hospitalUserId: string,
    limit: number
  ): Promise<HospitalAppointmentRecord[]> {
    const result = await this.pool.query<HospitalAppointmentRow>(
      `
      SELECT
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.donation_type,
        a.status,
        a.center_name,
        u.first_name AS donor_first_name,
        u.last_name AS donor_last_name,
        u.phone AS donor_phone,
        u.blood_type AS donor_blood_type
      FROM appointments a
      INNER JOIN users u ON u.id = a.donor_user_id
      WHERE a.hospital_user_id = $1
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT $2
      `,
      [hospitalUserId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      appointmentDate: row.appointment_date,
      appointmentTime: row.appointment_time,
      donationType: row.donation_type,
      status: row.status,
      centerName: row.center_name,
      donorFirstName: row.donor_first_name,
      donorLastName: row.donor_last_name,
      donorPhone: row.donor_phone,
      donorBloodType: row.donor_blood_type,
    }));
  }

  async updateHospitalAppointmentStatus(
    hospitalUserId: string,
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<boolean> {
    const result = await this.pool.query(
      `
      UPDATE appointments
      SET status = $1,
          updated_at = NOW()
      WHERE id = $2
        AND hospital_user_id = $3
      `,
      [status, appointmentId, hospitalUserId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async listHospitalEmergencies(hospitalUserId: string, limit: number): Promise<EmergencyRecord[]> {
    const result = await this.pool.query<EmergencyRow>(
      `
      SELECT
        e.id,
        e.blood_type,
        e.priority,
        e.message,
        e.created_at,
        e.quantity_needed,
        e.notified_donors,
        e.positive_responses,
        e.donations_completed,
        u.hospital_name,
        u.first_name,
        u.last_name,
        u.city
      FROM emergency_alerts e
      INNER JOIN users u ON u.id = e.hospital_user_id
      WHERE e.hospital_user_id = $1
      ORDER BY e.created_at DESC
      LIMIT $2
      `,
      [hospitalUserId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      bloodType: row.blood_type,
      priority: row.priority,
      message: row.message,
      createdAt: row.created_at.toISOString(),
      quantityNeeded: row.quantity_needed,
      notifiedDonors: row.notified_donors,
      positiveResponses: row.positive_responses,
      donationsCompleted: row.donations_completed,
      hospitalName: row.hospital_name ?? `${row.first_name} ${row.last_name}`,
      city: row.city,
    }));
  }

  async createEmergencyAlert(input: CreateEmergencyInput): Promise<EmergencyRecord> {
    const result = await this.pool.query<EmergencyRow>(
      `
      INSERT INTO emergency_alerts (
        id,
        hospital_user_id,
        blood_type,
        quantity_needed,
        message,
        priority,
        status,
        notified_donors,
        positive_responses,
        donations_completed
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, 0, 0)
      RETURNING
        id,
        blood_type,
        priority,
        message,
        created_at,
        quantity_needed,
        notified_donors,
        positive_responses,
        donations_completed,
        ''::varchar as hospital_name,
        ''::varchar as first_name,
        ''::varchar as last_name,
        NULL::varchar as city
      `,
      [
        input.id,
        input.hospitalUserId,
        input.bloodType,
        input.quantityNeeded,
        input.message,
        input.priority,
        input.notifiedDonors,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      bloodType: row.blood_type,
      priority: row.priority,
      message: row.message,
      createdAt: row.created_at.toISOString(),
      quantityNeeded: row.quantity_needed,
      notifiedDonors: row.notified_donors,
      positiveResponses: row.positive_responses,
      donationsCompleted: row.donations_completed,
      hospitalName: "",
      city: null,
    };
  }

  async countActiveDonorsByCity(city: string | null): Promise<number> {
    const result = await this.pool.query<CountRow>(
      `
      SELECT COUNT(*)::int AS total
      FROM users
      WHERE role = 'DONOR'
        AND ($1::text IS NULL OR city = $1)
      `,
      [city]
    );

    return result.rows[0]?.total ?? 0;
  }

  async countCompatibleDonors(city: string | null, bloodType: string): Promise<number> {
    const result = await this.pool.query<CountRow>(
      `
      SELECT COUNT(*)::int AS total
      FROM users
      WHERE role = 'DONOR'
        AND blood_type = $2
        AND ($1::text IS NULL OR city = $1)
      `,
      [city, bloodType]
    );

    return result.rows[0]?.total ?? 0;
  }

  private mapCampaignRow(row: CampaignRow): CampaignRecord {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      targetDonations: row.target_donations,
      collectedDonations: row.collected_donations,
      status: row.status,
      location: row.location,
      createdAt: row.created_at.toISOString(),
    };
  }
}
