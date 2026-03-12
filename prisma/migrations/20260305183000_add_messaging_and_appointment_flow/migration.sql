CREATE TABLE IF NOT EXISTS "conversations" (
  "id" UUID NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "conversation_participants" (
  "conversation_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "last_read_at" TIMESTAMPTZ,
  CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id"),
  CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "conversation_messages" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "sender_user_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversation_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "appointments"
ADD COLUMN IF NOT EXISTS "conversation_id" UUID;

ALTER TABLE "donations"
ADD COLUMN IF NOT EXISTS "appointment_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_conversation_fkey'
  ) THEN
    ALTER TABLE "appointments"
    ADD CONSTRAINT "appointments_conversation_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'donations_appointment_fkey'
  ) THEN
    ALTER TABLE "donations"
    ADD CONSTRAINT "donations_appointment_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_donations_appointment_unique"
ON "donations"("appointment_id")
WHERE "appointment_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_conversation_participants_user"
ON "conversation_participants"("user_id");

CREATE INDEX IF NOT EXISTS "idx_conversation_messages_conversation"
ON "conversation_messages"("conversation_id", "created_at" DESC);
