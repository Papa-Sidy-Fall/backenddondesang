import type { Pool } from "pg";

export class DatabaseBootstrapService {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'DONOR',
        hospital_name VARCHAR(150),
        phone VARCHAR(30),
        birth_date DATE,
        blood_type VARCHAR(5),
        city VARCHAR(100),
        district VARCHAR(100),
        password_hash VARCHAR(255),
        auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
        google_id VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT users_auth_provider_check CHECK (auth_provider IN ('LOCAL', 'GOOGLE')),
        CONSTRAINT users_role_check CHECK (role IN ('DONOR', 'ADMIN', 'HOSPITAL'))
      );
    `);

    await this.pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'DONOR',
      ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(150);
    `);

    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'users_role_check'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT users_role_check CHECK (role IN ('DONOR', 'ADMIN', 'HOSPITAL'));
        END IF;
      END $$;
    `);

    await this.pool.query(`UPDATE users SET role = 'DONOR' WHERE role IS NULL;`);

    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`
    );

    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);`
    );

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        target_donations INTEGER NOT NULL CHECK (target_donations > 0),
        collected_donations INTEGER NOT NULL DEFAULT 0 CHECK (collected_donations >= 0),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        location VARCHAR(255) NOT NULL,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT campaigns_status_check CHECK (status IN ('ACTIVE', 'COMPLETED', 'PLANNED'))
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id UUID PRIMARY KEY,
        donor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hospital_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        center_name VARCHAR(150) NOT NULL,
        donation_type VARCHAR(80) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
        donation_date DATE NOT NULL,
        units INTEGER NOT NULL DEFAULT 1 CHECK (units > 0),
        appointment_id UUID UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT donations_status_check CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED'))
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY,
        donor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hospital_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        center_name VARCHAR(150) NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time VARCHAR(5) NOT NULL,
        donation_type VARCHAR(80) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        conversation_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT appointments_status_check CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'))
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY,
        subject VARCHAR(200) NOT NULL,
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_read_at TIMESTAMPTZ,
        PRIMARY KEY (conversation_id, user_id)
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id UUID PRIMARY KEY,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS conversation_id UUID;
    `);

    await this.pool.query(`
      ALTER TABLE donations
      ADD COLUMN IF NOT EXISTS appointment_id UUID;
    `);

    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'appointments_conversation_fkey'
        ) THEN
          ALTER TABLE appointments
          ADD CONSTRAINT appointments_conversation_fkey
          FOREIGN KEY (conversation_id)
          REFERENCES conversations(id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'donations_appointment_fkey'
        ) THEN
          ALTER TABLE donations
          ADD CONSTRAINT donations_appointment_fkey
          FOREIGN KEY (appointment_id)
          REFERENCES appointments(id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_appointment_unique
      ON donations (appointment_id)
      WHERE appointment_id IS NOT NULL;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS hospital_stocks (
        id UUID PRIMARY KEY,
        hospital_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blood_type VARCHAR(5) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        threshold INTEGER NOT NULL DEFAULT 0 CHECK (threshold >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT hospital_stocks_unique UNIQUE (hospital_user_id, blood_type)
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        id UUID PRIMARY KEY,
        hospital_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blood_type VARCHAR(5) NOT NULL,
        quantity_needed INTEGER NOT NULL CHECK (quantity_needed > 0),
        message TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'HIGH',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        notified_donors INTEGER NOT NULL DEFAULT 0 CHECK (notified_donors >= 0),
        positive_responses INTEGER NOT NULL DEFAULT 0 CHECK (positive_responses >= 0),
        donations_completed INTEGER NOT NULL DEFAULT 0 CHECK (donations_completed >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT emergency_alerts_priority_check CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM')),
        CONSTRAINT emergency_alerts_status_check CHECK (status IN ('ACTIVE', 'RESOLVED'))
      );
    `);

    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations (donor_user_id);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_donations_date ON donations (donation_date);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON appointments (hospital_user_id);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_appointments_donor ON appointments (donor_user_id);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointment_date);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_emergency_alerts_hospital ON emergency_alerts (hospital_user_id);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts (status);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants (user_id);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages (conversation_id, created_at DESC);`
    );
  }
}
