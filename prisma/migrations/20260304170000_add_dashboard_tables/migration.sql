CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "target_donations" INTEGER NOT NULL,
  "collected_donations" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "location" VARCHAR(255) NOT NULL,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaigns_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "campaigns_target_donations_check" CHECK ("target_donations" > 0),
  CONSTRAINT "campaigns_collected_donations_check" CHECK ("collected_donations" >= 0),
  CONSTRAINT "campaigns_status_check" CHECK ("status" IN ('ACTIVE', 'COMPLETED', 'PLANNED'))
);

CREATE TABLE IF NOT EXISTS "donations" (
  "id" UUID NOT NULL,
  "donor_user_id" UUID NOT NULL,
  "hospital_user_id" UUID,
  "center_name" VARCHAR(150) NOT NULL,
  "donation_type" VARCHAR(80) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
  "donation_date" DATE NOT NULL,
  "units" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "donations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "donations_donor_user_id_fkey" FOREIGN KEY ("donor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "donations_hospital_user_id_fkey" FOREIGN KEY ("hospital_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "donations_units_check" CHECK ("units" > 0),
  CONSTRAINT "donations_status_check" CHECK ("status" IN ('PENDING', 'COMPLETED', 'CANCELLED'))
);

CREATE TABLE IF NOT EXISTS "appointments" (
  "id" UUID NOT NULL,
  "donor_user_id" UUID NOT NULL,
  "hospital_user_id" UUID NOT NULL,
  "center_name" VARCHAR(150) NOT NULL,
  "appointment_date" DATE NOT NULL,
  "appointment_time" VARCHAR(5) NOT NULL,
  "donation_type" VARCHAR(80) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "appointments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointments_donor_user_id_fkey" FOREIGN KEY ("donor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "appointments_hospital_user_id_fkey" FOREIGN KEY ("hospital_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "appointments_status_check" CHECK ("status" IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'))
);

CREATE TABLE IF NOT EXISTS "hospital_stocks" (
  "id" UUID NOT NULL,
  "hospital_user_id" UUID NOT NULL,
  "blood_type" VARCHAR(5) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "threshold" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hospital_stocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hospital_stocks_hospital_user_id_fkey" FOREIGN KEY ("hospital_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "hospital_stocks_quantity_check" CHECK ("quantity" >= 0),
  CONSTRAINT "hospital_stocks_threshold_check" CHECK ("threshold" >= 0)
);

CREATE TABLE IF NOT EXISTS "emergency_alerts" (
  "id" UUID NOT NULL,
  "hospital_user_id" UUID NOT NULL,
  "blood_type" VARCHAR(5) NOT NULL,
  "quantity_needed" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "priority" VARCHAR(20) NOT NULL DEFAULT 'HIGH',
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "notified_donors" INTEGER NOT NULL DEFAULT 0,
  "positive_responses" INTEGER NOT NULL DEFAULT 0,
  "donations_completed" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "emergency_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "emergency_alerts_hospital_user_id_fkey" FOREIGN KEY ("hospital_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "emergency_alerts_quantity_needed_check" CHECK ("quantity_needed" > 0),
  CONSTRAINT "emergency_alerts_notified_donors_check" CHECK ("notified_donors" >= 0),
  CONSTRAINT "emergency_alerts_positive_responses_check" CHECK ("positive_responses" >= 0),
  CONSTRAINT "emergency_alerts_donations_completed_check" CHECK ("donations_completed" >= 0),
  CONSTRAINT "emergency_alerts_priority_check" CHECK ("priority" IN ('CRITICAL', 'HIGH', 'MEDIUM')),
  CONSTRAINT "emergency_alerts_status_check" CHECK ("status" IN ('ACTIVE', 'RESOLVED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "hospital_stocks_unique" ON "hospital_stocks"("hospital_user_id", "blood_type");
CREATE INDEX IF NOT EXISTS "idx_campaigns_status" ON "campaigns"("status");
CREATE INDEX IF NOT EXISTS "idx_donations_donor" ON "donations"("donor_user_id");
CREATE INDEX IF NOT EXISTS "idx_donations_date" ON "donations"("donation_date");
CREATE INDEX IF NOT EXISTS "idx_appointments_hospital" ON "appointments"("hospital_user_id");
CREATE INDEX IF NOT EXISTS "idx_appointments_donor" ON "appointments"("donor_user_id");
CREATE INDEX IF NOT EXISTS "idx_appointments_date" ON "appointments"("appointment_date");
CREATE INDEX IF NOT EXISTS "idx_emergency_alerts_hospital" ON "emergency_alerts"("hospital_user_id");
CREATE INDEX IF NOT EXISTS "idx_emergency_alerts_status" ON "emergency_alerts"("status");
