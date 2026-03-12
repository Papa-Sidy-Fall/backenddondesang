import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { IUserRepository } from "../repositories/interfaces/user-repository.interface.js";
import { resolveStockThreshold } from "../shared/constants/stock-thresholds.js";
import { AppLogger } from "../shared/logging/app-logger.js";
import { CNTS_EMAIL, LEGACY_ADMIN_EMAIL } from "../shared/auth/cnts-user.js";

interface LegacyAdminStockRow {
  blood_type: string;
  quantity: number;
  threshold: number;
}

export class LegacyAdminMergeService {
  constructor(
    private readonly pool: Pool,
    private readonly userRepository: IUserRepository,
    private readonly logger: AppLogger
  ) {}

  async mergeIfNeeded(): Promise<void> {
    const [legacyAdmin, cntsUser] = await Promise.all([
      this.userRepository.findByEmail(LEGACY_ADMIN_EMAIL),
      this.userRepository.findByEmail(CNTS_EMAIL),
    ]);

    if (!legacyAdmin || !cntsUser || legacyAdmin.id === cntsUser.id) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const adminStocks = await client.query<LegacyAdminStockRow>(
        `
        SELECT blood_type, quantity, threshold
        FROM hospital_stocks
        WHERE hospital_user_id = $1
        `,
        [legacyAdmin.id]
      );

      for (const stock of adminStocks.rows) {
        const threshold = resolveStockThreshold(stock.blood_type, stock.threshold);

        await client.query(
          `
          INSERT INTO hospital_stocks (
            id,
            hospital_user_id,
            blood_type,
            quantity,
            threshold,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (hospital_user_id, blood_type)
          DO UPDATE
          SET quantity = hospital_stocks.quantity + EXCLUDED.quantity,
              threshold = CASE
                WHEN hospital_stocks.threshold <= 0 THEN EXCLUDED.threshold
                ELSE hospital_stocks.threshold
              END,
              updated_at = NOW()
          `,
          [randomUUID(), cntsUser.id, stock.blood_type, stock.quantity, threshold]
        );
      }

      await client.query(`DELETE FROM hospital_stocks WHERE hospital_user_id = $1`, [legacyAdmin.id]);

      await client.query(
        `UPDATE campaigns SET created_by_user_id = $1 WHERE created_by_user_id = $2`,
        [cntsUser.id, legacyAdmin.id]
      );
      await client.query(
        `UPDATE donations SET hospital_user_id = $1 WHERE hospital_user_id = $2`,
        [cntsUser.id, legacyAdmin.id]
      );
      await client.query(
        `UPDATE appointments SET hospital_user_id = $1 WHERE hospital_user_id = $2`,
        [cntsUser.id, legacyAdmin.id]
      );
      await client.query(
        `UPDATE emergency_alerts SET hospital_user_id = $1 WHERE hospital_user_id = $2`,
        [cntsUser.id, legacyAdmin.id]
      );
      await client.query(
        `UPDATE conversations SET created_by_user_id = $1 WHERE created_by_user_id = $2`,
        [cntsUser.id, legacyAdmin.id]
      );
      await client.query(
        `UPDATE conversation_messages SET sender_user_id = $1 WHERE sender_user_id = $2`,
        [cntsUser.id, legacyAdmin.id]
      );

      await client.query(
        `
        INSERT INTO conversation_participants (conversation_id, user_id, last_read_at)
        SELECT cp.conversation_id, $1, cp.last_read_at
        FROM conversation_participants cp
        WHERE cp.user_id = $2
          AND NOT EXISTS (
            SELECT 1
            FROM conversation_participants existing
            WHERE existing.conversation_id = cp.conversation_id
              AND existing.user_id = $1
          )
        `,
        [cntsUser.id, legacyAdmin.id]
      );

      await client.query(
        `DELETE FROM conversation_participants WHERE user_id = $1`,
        [legacyAdmin.id]
      );

      await client.query(`DELETE FROM users WHERE id = $1`, [legacyAdmin.id]);

      await client.query("COMMIT");

      this.logger.info("Legacy admin account merged into CNTS", {
        legacyAdminEmail: legacyAdmin.email,
        cntsEmail: cntsUser.email,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
