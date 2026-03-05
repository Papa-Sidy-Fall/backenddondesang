import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  JWT_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URLS: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  DEV_LOG_TOKEN: z.string().optional(),
  DEV_LOG_EMAIL: z.email().default("dev.logs@dondesang.sn"),
  DEV_LOG_PASSWORD: z.string().min(8).default("DevLogs@2026"),
  LOG_RETENTION_SIZE: z.coerce.number().int().positive().default(500),
  DEFAULT_ADMIN_EMAIL: z.email().default("admin@dondesang.sn"),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).default("Admin@2026"),
  DEFAULT_DANTEC_EMAIL: z.email().default("dantec@dondesang.sn"),
  DEFAULT_DANTEC_PASSWORD: z.string().min(8).default("Dantec@2026"),
  DEFAULT_FANN_EMAIL: z.email().default("fann@dondesang.sn"),
  DEFAULT_FANN_PASSWORD: z.string().min(8).default("Fann@2026"),
});

type ParsedEnvironment = z.infer<typeof envSchema>;

function parseFrontendUrls(parsed: ParsedEnvironment): string[] {
  const defaults = ["http://localhost:5173", "https://frontdondesang.vercel.app"];
  const fromEnv = (parsed.FRONTEND_URLS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const unique = new Set([...defaults, ...fromEnv]);
  return Array.from(unique);
}

function getJwtSecret(parsed: ParsedEnvironment): string {
  if (parsed.JWT_SECRET) {
    return parsed.JWT_SECRET;
  }

  if (parsed.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }

  return "dev-jwt-secret-change-me-123456";
}

const parsed = envSchema.parse(process.env);

export const env = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  databaseUrl: parsed.DATABASE_URL,
  dbHost: parsed.DB_HOST,
  dbPort: parsed.DB_PORT,
  dbUser: parsed.DB_USER,
  dbPassword: parsed.DB_PASSWORD,
  dbName: parsed.DB_NAME,
  jwtSecret: getJwtSecret(parsed),
  jwtExpiresIn: parsed.JWT_EXPIRES_IN,
  frontendUrls: parseFrontendUrls(parsed),
  googleClientId: parsed.GOOGLE_CLIENT_ID,
  googleClientSecret: parsed.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl: parsed.GOOGLE_CALLBACK_URL,
  devLogToken: parsed.DEV_LOG_TOKEN,
  devLogs: {
    email: parsed.DEV_LOG_EMAIL,
    password: parsed.DEV_LOG_PASSWORD,
  },
  logRetentionSize: parsed.LOG_RETENTION_SIZE,
  defaultAccounts: {
    admin: {
      email: parsed.DEFAULT_ADMIN_EMAIL,
      password: parsed.DEFAULT_ADMIN_PASSWORD,
    },
    dantec: {
      email: parsed.DEFAULT_DANTEC_EMAIL,
      password: parsed.DEFAULT_DANTEC_PASSWORD,
    },
    fann: {
      email: parsed.DEFAULT_FANN_EMAIL,
      password: parsed.DEFAULT_FANN_PASSWORD,
    },
  },
} as const;

export type AppEnvironment = typeof env;
