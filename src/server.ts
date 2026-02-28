import "dotenv/config";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

const app = express();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  const hasDbParts =
    process.env.DB_HOST &&
    process.env.DB_PORT &&
    process.env.DB_USER &&
    process.env.DB_PASSWORD &&
    process.env.DB_NAME;

  if (!hasDbParts) {
    throw new Error(
      "Set DATABASE_URL or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
    );
  }
}

const pool =
  databaseUrl && databaseUrl.trim() !== ""
    ? new Pool({ connectionString: databaseUrl })
    : new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "🩸 API DonDeSang opérationnelle" });
});

app.get("/test-db", async (req, res) => {
  try {
    await prisma.$connect();
    res.json({ message: "✅ Connexion PostgreSQL réussie" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "❌ Erreur connexion DB" });
  }
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});
