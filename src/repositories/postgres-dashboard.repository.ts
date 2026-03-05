import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { AppointmentStatus } from "../domain/enums/appointment-status.enum.js";
import type {
  BloodDistributionRecord,
  CampaignRecord,
  CenterRecord,
  ContactRecord,
  CreateCampaignInput,
  CreateConversationInput,
  CreateConversationMessageInput,
  CreateAppointmentInput,
  CreateEmergencyInput,
  ConversationMessageRecord,
  ConversationParticipantRecord,
  ConversationSummaryRecord,
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
  UpsertManualStockInput,
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
  phone: string | null;
  blood_type: string | null;
  city: string | null;
  district: string | null;
  birth_date: string | null;
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
  donor_user_id: string;
  appointment_date: string;
  appointment_time: string;
  donation_type: string;
  status: string;
  center_name: string;
  donor_first_name: string;
  donor_last_name: string;
  donor_email: string;
  donor_phone: string | null;
  donor_blood_type: string | null;
  donor_city: string | null;
  donor_district: string | null;
  donor_birth_date: string | null;
}

interface ConversationSummaryRow {
  id: string;
  subject: string;
  created_at: Date;
  updated_at: Date;
  last_message: string | null;
  last_message_at: Date | null;
  unread_count: number;
}

interface ConversationParticipantRow {
  conversation_id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  hospital_name: string | null;
}

interface ConversationMessageRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_first_name: string;
  sender_last_name: string;
  sender_role: string;
  body: string;
  created_at: Date;
}

interface ContactRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  hospital_name: string | null;
  city: string | null;
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
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        blood_type,
        city,
        district,
        birth_date,
        created_at
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
      phone: row.phone,
      bloodType: row.blood_type,
      city: row.city,
      district: row.district,
      birthDate: row.birth_date,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async listDetailedDonors(limit: number): Promise<LatestDonorRecord[]> {
    const result = await this.pool.query<LatestDonorRow>(
      `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        blood_type,
        city,
        district,
        birth_date,
        created_at
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
      phone: row.phone,
      bloodType: row.blood_type,
      city: row.city,
      district: row.district,
      birthDate: row.birth_date,
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
        a.donor_user_id,
        a.appointment_date,
        a.appointment_time,
        a.donation_type,
        a.status,
        a.center_name,
        u.first_name AS donor_first_name,
        u.last_name AS donor_last_name,
        u.email AS donor_email,
        u.phone AS donor_phone,
        u.blood_type AS donor_blood_type,
        u.city AS donor_city,
        u.district AS donor_district,
        u.birth_date AS donor_birth_date
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
      donorUserId: row.donor_user_id,
      appointmentDate: row.appointment_date,
      appointmentTime: row.appointment_time,
      donationType: row.donation_type,
      status: row.status,
      centerName: row.center_name,
      donorFirstName: row.donor_first_name,
      donorLastName: row.donor_last_name,
      donorEmail: row.donor_email,
      donorPhone: row.donor_phone,
      donorBloodType: row.donor_blood_type,
      donorCity: row.donor_city,
      donorDistrict: row.donor_district,
      donorBirthDate: row.donor_birth_date,
    }));
  }

  async updateHospitalAppointmentStatus(
    hospitalUserId: string,
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await client.query<{
        id: string;
        donor_user_id: string;
        center_name: string;
        donation_type: string;
        appointment_date: string;
        status: string;
        donor_blood_type: string | null;
      }>(
        `
        SELECT
          a.id,
          a.donor_user_id,
          a.center_name,
          a.donation_type,
          a.appointment_date,
          a.status,
          u.blood_type AS donor_blood_type
        FROM appointments a
        INNER JOIN users u ON u.id = a.donor_user_id
        WHERE a.id = $1
          AND a.hospital_user_id = $2
        LIMIT 1
        `,
        [appointmentId, hospitalUserId]
      );

      if ((existing.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return false;
      }

      await client.query(
        `
        UPDATE appointments
        SET status = $1,
            updated_at = NOW()
        WHERE id = $2
          AND hospital_user_id = $3
        `,
        [status, appointmentId, hospitalUserId]
      );

      const row = existing.rows[0];

      if (status === "COMPLETED" && row.status !== "COMPLETED" && row.donor_blood_type) {
        await client.query(
          `
          INSERT INTO hospital_stocks (
            id,
            hospital_user_id,
            blood_type,
            quantity,
            threshold,
            updated_at
          )
          VALUES ($1, $2, $3, 1, 0, NOW())
          ON CONFLICT (hospital_user_id, blood_type)
          DO UPDATE
          SET quantity = hospital_stocks.quantity + 1,
              updated_at = NOW()
          `,
          [randomUUID(), hospitalUserId, row.donor_blood_type]
        );

        await client.query(
          `
          INSERT INTO donations (
            id,
            donor_user_id,
            hospital_user_id,
            center_name,
            donation_type,
            status,
            donation_date,
            units,
            appointment_id
          )
          SELECT $1, $2, $3, $4, $5, 'COMPLETED', $6::date, 1, $7
          WHERE NOT EXISTS (
            SELECT 1
            FROM donations
            WHERE appointment_id = $7
          )
          `,
          [
            randomUUID(),
            row.donor_user_id,
            hospitalUserId,
            row.center_name,
            row.donation_type,
            row.appointment_date,
            appointmentId,
          ]
        );
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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

  async upsertManualStock(input: UpsertManualStockInput): Promise<void> {
    const threshold = input.threshold ?? 0;

    if (input.mode === "SET") {
      await this.pool.query(
        `
        INSERT INTO hospital_stocks (
          id,
          hospital_user_id,
          blood_type,
          quantity,
          threshold,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (hospital_user_id, blood_type)
        DO UPDATE
        SET quantity = EXCLUDED.quantity,
            threshold = CASE WHEN $6::boolean THEN EXCLUDED.threshold ELSE hospital_stocks.threshold END,
            updated_at = NOW()
        `,
        [
          randomUUID(),
          input.hospitalUserId,
          input.bloodType,
          input.quantity,
          threshold,
          input.threshold !== undefined,
        ]
      );

      return;
    }

    await this.pool.query(
      `
      INSERT INTO hospital_stocks (
        id,
        hospital_user_id,
        blood_type,
        quantity,
        threshold,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (hospital_user_id, blood_type)
      DO UPDATE
      SET quantity = hospital_stocks.quantity + EXCLUDED.quantity,
          threshold = CASE WHEN $6::boolean THEN EXCLUDED.threshold ELSE hospital_stocks.threshold END,
          updated_at = NOW()
      `,
      [
        randomUUID(),
        input.hospitalUserId,
        input.bloodType,
        input.quantity,
        threshold,
        input.threshold !== undefined,
      ]
    );
  }

  async createAppointment(input: CreateAppointmentInput): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO appointments (
        id,
        donor_user_id,
        hospital_user_id,
        center_name,
        appointment_date,
        appointment_time,
        donation_type,
        status,
        conversation_id
      )
      VALUES ($1, $2, $3, $4, $5::date, $6, $7, 'PENDING', $8)
      `,
      [
        input.id,
        input.donorUserId,
        input.hospitalUserId,
        input.centerName,
        input.appointmentDate,
        input.appointmentTime,
        input.donationType,
        input.conversationId ?? null,
      ]
    );
  }

  async findHospitalDonors(hospitalUserId: string, limit: number): Promise<LatestDonorRecord[]> {
    const result = await this.pool.query<LatestDonorRow>(
      `
      WITH donor_activity AS (
        SELECT
          a.donor_user_id AS donor_id,
          MAX(a.updated_at) AS last_activity
        FROM appointments a
        WHERE a.hospital_user_id = $1
        GROUP BY a.donor_user_id
      )
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.blood_type,
        u.city,
        u.district,
        u.birth_date,
        u.created_at
      FROM donor_activity da
      INNER JOIN users u ON u.id = da.donor_id
      ORDER BY da.last_activity DESC
      LIMIT $2
      `,
      [hospitalUserId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      bloodType: row.blood_type,
      city: row.city,
      district: row.district,
      birthDate: row.birth_date,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async listCenters(
    city: string | undefined,
    bloodType: string | undefined,
    centers: CenterRecord[]
  ): Promise<CenterRecord[]> {
    const normalizedCity = city?.trim().toLowerCase();
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    return centers.filter((center) => {
      const cityMatches = !normalizedCity || normalize(center.city) === normalizedCity;
      const bloodMatches = !bloodType || center.supportedBloodTypes.includes(bloodType);
      return cityMatches && bloodMatches;
    });
  }

  async createConversation(input: CreateConversationInput): Promise<void> {
    const participantUserIds = Array.from(new Set([input.createdByUserId, ...input.participantUserIds]));

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `
        INSERT INTO conversations (
          id,
          subject,
          created_by_user_id,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, NOW(), NOW())
        `,
        [input.id, input.subject, input.createdByUserId]
      );

      for (const userId of participantUserIds) {
        await client.query(
          `
          INSERT INTO conversation_participants (
            conversation_id,
            user_id,
            last_read_at
          )
          VALUES ($1, $2, NOW())
          ON CONFLICT (conversation_id, user_id) DO NOTHING
          `,
          [input.id, userId]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findDirectConversation(userId: string, participantUserId: string): Promise<string | null> {
    const result = await this.pool.query<{ id: string }>(
      `
      SELECT c.id
      FROM conversations c
      INNER JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $1
      INNER JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $2
      WHERE NOT EXISTS (
        SELECT 1
        FROM conversation_participants p3
        WHERE p3.conversation_id = c.id
          AND p3.user_id NOT IN ($1, $2)
      )
      ORDER BY c.updated_at DESC
      LIMIT 1
      `,
      [userId, participantUserId]
    );

    return result.rows[0]?.id ?? null;
  }

  async listConversations(userId: string, limit: number): Promise<ConversationSummaryRecord[]> {
    const result = await this.pool.query<ConversationSummaryRow>(
      `
      SELECT
        c.id,
        c.subject,
        c.created_at,
        c.updated_at,
        lm.body AS last_message,
        lm.created_at AS last_message_at,
        COALESCE((
          SELECT COUNT(*)::int
          FROM conversation_messages cm
          WHERE cm.conversation_id = c.id
            AND cm.created_at > COALESCE(cp.last_read_at, to_timestamp(0))
            AND cm.sender_user_id <> $1
        ), 0) AS unread_count
      FROM conversation_participants cp
      INNER JOIN conversations c ON c.id = cp.conversation_id
      LEFT JOIN LATERAL (
        SELECT body, created_at
        FROM conversation_messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      WHERE cp.user_id = $1
      ORDER BY COALESCE(lm.created_at, c.updated_at) DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at?.toISOString() ?? null,
      unreadCount: row.unread_count,
    }));
  }

  async listConversationParticipants(
    conversationIds: string[]
  ): Promise<ConversationParticipantRecord[]> {
    if (conversationIds.length === 0) {
      return [];
    }

    const result = await this.pool.query<ConversationParticipantRow>(
      `
      SELECT
        cp.conversation_id,
        cp.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.hospital_name
      FROM conversation_participants cp
      INNER JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = ANY($1::uuid[])
      `,
      [conversationIds]
    );

    return result.rows.map((row) => ({
      conversationId: row.conversation_id,
      userId: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      hospitalName: row.hospital_name,
    }));
  }

  async listConversationMessages(
    userId: string,
    conversationId: string,
    limit: number
  ): Promise<ConversationMessageRecord[]> {
    const hasAccess = await this.pool.query(
      `
      SELECT 1
      FROM conversation_participants
      WHERE conversation_id = $1
        AND user_id = $2
      LIMIT 1
      `,
      [conversationId, userId]
    );

    if ((hasAccess.rowCount ?? 0) === 0) {
      return [];
    }

    await this.pool.query(
      `
      UPDATE conversation_participants
      SET last_read_at = NOW()
      WHERE conversation_id = $1
        AND user_id = $2
      `,
      [conversationId, userId]
    );

    const result = await this.pool.query<ConversationMessageRow>(
      `
      SELECT
        cm.id,
        cm.conversation_id,
        cm.sender_user_id,
        u.first_name AS sender_first_name,
        u.last_name AS sender_last_name,
        u.role AS sender_role,
        cm.body,
        cm.created_at
      FROM conversation_messages cm
      INNER JOIN users u ON u.id = cm.sender_user_id
      WHERE cm.conversation_id = $1
      ORDER BY cm.created_at DESC
      LIMIT $2
      `,
      [conversationId, limit]
    );

    return result.rows
      .reverse()
      .map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderUserId: row.sender_user_id,
        senderName: `${row.sender_first_name} ${row.sender_last_name}`.trim(),
        senderRole: row.sender_role,
        body: row.body,
        createdAt: row.created_at.toISOString(),
      }));
  }

  async createConversationMessage(input: CreateConversationMessageInput): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO conversation_messages (
        id,
        conversation_id,
        sender_user_id,
        body,
        created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      `,
      [input.id, input.conversationId, input.senderUserId, input.body]
    );

    await this.pool.query(
      `
      UPDATE conversations
      SET updated_at = NOW()
      WHERE id = $1
      `,
      [input.conversationId]
    );
  }

  async listContacts(userId: string, userRole: string): Promise<ContactRecord[]> {
    if (userRole === "DONOR") {
      const result = await this.pool.query<ContactRow>(
        `
        SELECT id, email, first_name, last_name, role, hospital_name, city
        FROM users
        WHERE id <> $1
          AND role = 'HOSPITAL'
        ORDER BY hospital_name ASC NULLS LAST, first_name ASC, last_name ASC
        `,
        [userId]
      );

      return result.rows.map((row) => this.mapContactRow(row));
    }

    if (userRole === "HOSPITAL") {
      const result = await this.pool.query<ContactRow>(
        `
        SELECT DISTINCT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.role,
          u.hospital_name,
          u.city
        FROM users u
        WHERE u.id <> $1
          AND (
            u.role = 'HOSPITAL'
            OR (
              u.role = 'DONOR'
              AND EXISTS (
                SELECT 1
                FROM appointments a
                WHERE a.hospital_user_id = $1
                  AND a.donor_user_id = u.id
              )
            )
          )
        ORDER BY u.role ASC, u.hospital_name ASC NULLS LAST, u.first_name ASC, u.last_name ASC
        `,
        [userId]
      );

      return result.rows.map((row) => this.mapContactRow(row));
    }

    const result = await this.pool.query<ContactRow>(
      `
      SELECT id, email, first_name, last_name, role, hospital_name, city
      FROM users
      WHERE id <> $1
        AND role IN ('HOSPITAL', 'ADMIN')
      ORDER BY role ASC, hospital_name ASC NULLS LAST, first_name ASC, last_name ASC
      `,
      [userId]
    );

    return result.rows.map((row) => this.mapContactRow(row));
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

  private mapContactRow(row: ContactRow): ContactRecord {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      hospitalName: row.hospital_name,
      city: row.city,
    };
  }
}
