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
        CONSTRAINT users_auth_provider_check CHECK (auth_provider IN ('LOCAL', 'GOOGLE'))
      );
    `);

    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`
    );

    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);`
    );
  }
}
