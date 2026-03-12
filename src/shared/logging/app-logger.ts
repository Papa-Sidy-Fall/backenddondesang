import type { LogEntry, LogLevel } from "./log-entry.js";
import { LogStore } from "./log-store.js";

export class AppLogger {
  constructor(private readonly store: LogStore) {}

  debug(message: string, context?: Record<string, unknown>): LogEntry {
    return this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): LogEntry {
    return this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): LogEntry {
    return this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): LogEntry {
    return this.log("error", message, context);
  }

  getLogs(options?: { level?: LogLevel; limit?: number; search?: string }): LogEntry[] {
    return this.store.list(options);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    const entry = this.store.add(level, message, context);
    console.log(
      JSON.stringify({
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp,
        context: entry.context,
      })
    );
    return entry;
  }
}
