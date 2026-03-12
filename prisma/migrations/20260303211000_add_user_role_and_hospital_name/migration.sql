ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "role" VARCHAR(20) NOT NULL DEFAULT 'DONOR',
ADD COLUMN IF NOT EXISTS "hospital_name" VARCHAR(150);

UPDATE "users"
SET "role" = 'DONOR'
WHERE "role" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_role_check"
    CHECK ("role" IN ('DONOR', 'ADMIN', 'HOSPITAL'));
  END IF;
END $$;
