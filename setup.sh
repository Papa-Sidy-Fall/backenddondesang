#!/bin/bash

echo "🚀 Setup Backend DonDeSang..."

# 1️⃣ Init projet
npm init -y

# 2️⃣ Modifier package.json (type module + scripts)
cat > package.json <<EOL
{
  "name": "dondesang-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
EOL

# 3️⃣ Installation dépendances
npm install express cors bcrypt jsonwebtoken zod @prisma/client
npm install -D typescript prisma tsx @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken

# 4️⃣ Config TypeScript PRO
cat > tsconfig.json <<EOL
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "exclude": ["node_modules", "dist"]
}
EOL

# 5️⃣ Prisma
npx prisma init

# 6️⃣ .env avec mot de passe encodé (@ => %40)
echo 'DATABASE_URL="postgresql://papasidy:Bbovd%403040@localhost:5432/dondesang"' > .env

# 7️⃣ Structure
mkdir src

# 8️⃣ server.ts
cat > src/server.ts <<EOL
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "🩸 API DonDeSang opérationnelle" });
});

app.get("/test-db", async (req, res) => {
  try {
    await prisma.\$connect();
    res.json({ message: "✅ Connexion PostgreSQL réussie" });
  } catch (error) {
    res.status(500).json({ error: "❌ Erreur connexion DB" });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(\`🔥 Server running on http://localhost:\${PORT}\`);
});
EOL

echo "✅ Setup terminé."
echo "👉 Lance : npm run dev"