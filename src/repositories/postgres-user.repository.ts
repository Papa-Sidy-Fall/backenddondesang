import type { Pool } from "pg";
import type { User } from "../domain/entities/user.entity.js";
import type { CreateUserInput, IUserRepository } from "./interfaces/user-repository.interface.js";

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  birth_date: string | null;
  blood_type: string | null;
  city: string | null;
  district: string | null;
  password_hash: string | null;
  auth_provider: string;
  google_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  async findById(userId: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    return result.rowCount ? this.mapRowToEntity(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    return result.rowCount ? this.mapRowToEntity(result.rows[0]) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT * FROM users WHERE google_id = $1 LIMIT 1`,
      [googleId]
    );

    return result.rowCount ? this.mapRowToEntity(result.rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const result = await this.pool.query<UserRow>(
      `
      INSERT INTO users (
        id,
        email,
        first_name,
        last_name,
        phone,
        birth_date,
        blood_type,
        city,
        district,
        password_hash,
        auth_provider,
        google_id
      )
      VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10, $11, $12)
      RETURNING *
      `,
      [
        input.id,
        input.email,
        input.firstName,
        input.lastName,
        input.phone ?? null,
        input.birthDate ?? null,
        input.bloodType ?? null,
        input.city ?? null,
        input.district ?? null,
        input.passwordHash ?? null,
        input.authProvider,
        input.googleId ?? null,
      ]
    );

    return this.mapRowToEntity(result.rows[0]);
  }

  async attachGoogleIdentity(userId: string, googleId: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE users
      SET google_id = $1,
          auth_provider = 'GOOGLE',
          updated_at = NOW()
      WHERE id = $2
      `,
      [googleId, userId]
    );
  }

  private mapRowToEntity(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      birthDate: row.birth_date,
      bloodType: row.blood_type,
      city: row.city,
      district: row.district,
      passwordHash: row.password_hash,
      authProvider: row.auth_provider as User["authProvider"],
      googleId: row.google_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
