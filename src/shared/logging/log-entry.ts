export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}
