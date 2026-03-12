ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "cni" VARCHAR(13);

CREATE INDEX IF NOT EXISTS "idx_users_cni"
ON "users"("cni");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_donor_cni_unique'
  ) THEN
    IF NOT EXISTS (
      SELECT "cni"
      FROM "users"
      WHERE "role" = 'DONOR'
        AND "cni" IS NOT NULL
        AND btrim("cni") <> ''
      GROUP BY "cni"
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX "idx_users_donor_cni_unique"
      ON "users"("cni")
      WHERE "role" = 'DONOR' AND "cni" IS NOT NULL AND btrim("cni") <> '';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_donor_phone_unique'
  ) THEN
    IF NOT EXISTS (
      SELECT "phone"
      FROM "users"
      WHERE "role" = 'DONOR'
        AND "phone" IS NOT NULL
        AND btrim("phone") <> ''
      GROUP BY "phone"
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX "idx_users_donor_phone_unique"
      ON "users"("phone")
      WHERE "role" = 'DONOR' AND "phone" IS NOT NULL AND btrim("phone") <> '';
    END IF;
  END IF;
END $$;
