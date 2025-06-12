interface ErrorLogEntry {
  timestamp: string
  level: "error" | "warn" | "info"
  message: string
  details?: any
  userId?: string
  endpoint?: string
  userAgent?: string
}

export class ErrorLogger {
  private static instance: ErrorLogger
  private logs: ErrorLogEntry[] = []

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  log(
    level: "error" | "warn" | "info",
    message: string,
    details?: any,
    context?: {
      userId?: string
      endpoint?: string
      userAgent?: string
    },
  ) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
      ...context,
    }

    this.logs.push(entry)

    // Console logging with emojis for better visibility
    const emoji = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️"
    console.log(`${emoji} [${level.toUpperCase()}] ${message}`, details || "")

    // Keep only last 1000 logs to prevent memory issues
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000)
    }

    // In production, you might want to send critical errors to an external service
    if (level === "error" && typeof window !== "undefined") {
      // Could integrate with services like Sentry, LogRocket, etc.
      this.reportToExternalService(entry)
    }
  }

  private reportToExternalService(entry: ErrorLogEntry) {
    // Placeholder for external error reporting
    // Example: Sentry.captureException(new Error(entry.message), { extra: entry.details })
  }

  getLogs(level?: "error" | "warn" | "info"): ErrorLogEntry[] {
    if (level) {
      return this.logs.filter((log) => log.level === level)
    }
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
  }
}

export const logger = ErrorLogger.getInstance()
