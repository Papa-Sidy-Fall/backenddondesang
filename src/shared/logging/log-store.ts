import { randomUUID } from "node:crypto";
import type { LogEntry, LogLevel } from "./log-entry.js";

export class LogStore {
  private readonly entries: LogEntry[] = [];

  constructor(private readonly retentionSize: number) {}

  add(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      id: randomUUID(),
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    this.entries.unshift(entry);

    if (this.entries.length > this.retentionSize) {
      this.entries.length = this.retentionSize;
    }

    return entry;
  }

  list(options?: { level?: LogLevel; limit?: number; search?: string }): LogEntry[] {
    const level = options?.level;
    const limit = options?.limit ?? 100;
    const search = options?.search?.toLowerCase().trim();

    return this.entries
      .filter((entry) => {
        if (level && entry.level !== level) {
          return false;
        }

        if (!search) {
          return true;
        }

        const inMessage = entry.message.toLowerCase().includes(search);
        const inContext = JSON.stringify(entry.context ?? {}).toLowerCase().includes(search);
        return inMessage || inContext;
      })
      .slice(0, limit);
  }
}
