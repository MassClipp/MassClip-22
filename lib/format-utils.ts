/**
 * Utility functions for formatting numbers, dates, and other data
 */

/**
 * Safely convert a value to a number, returning 0 for invalid inputs
 */
export function safeNumber(value: any): number {
  if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(amount: number): string {
  const safeAmount = safeNumber(amount)
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount)
}

/**
 * Format a number with proper locale formatting
 */
export function formatNumber(value: number): string {
  const safeValue = safeNumber(value)
  return new Intl.NumberFormat("en-US").format(safeValue)
}

/**
 * Format a number as an integer (whole number)
 */
export function formatInteger(value: number): string {
  const safeValue = safeNumber(value)
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.floor(safeValue))
}

/**
 * Format a percentage with + or - sign
 */
export function formatPercentage(value: number): string {
  const safeValue = safeNumber(value)
  const sign = safeValue >= 0 ? "+" : ""
  return `${sign}${safeValue.toFixed(1)}%`
}

/**
 * Format a date in short format
 */
export function formatDate(date: Date | string): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return "Invalid Date"
    }
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return "Invalid Date"
  }
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return "Invalid Date"
    }
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return "Invalid Date"
  }
}

/**
 * Format duration from seconds to HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const safeSeconds = safeNumber(seconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = Math.floor(safeSeconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  const safeBytes = safeNumber(bytes)
  if (safeBytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(safeBytes) / Math.log(k))

  return Number.parseFloat((safeBytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  const safeCurrent = safeNumber(current)
  const safePrevious = safeNumber(previous)

  if (safePrevious === 0) {
    return safeCurrent > 0 ? 100 : 0
  }

  return ((safeCurrent - safePrevious) / safePrevious) * 100
}

/**
 * Validate and sanitize earnings data structure
 */
export function validateEarningsData(data: any): any {
  if (!data || typeof data !== "object") {
    return createDefaultEarningsData()
  }

  return {
    totalEarnings: safeNumber(data.totalEarnings),
    thisMonthEarnings: safeNumber(data.thisMonthEarnings),
    lastMonthEarnings: safeNumber(data.lastMonthEarnings),
    last30DaysEarnings: safeNumber(data.last30DaysEarnings),
    pendingPayout: safeNumber(data.pendingPayout),
    availableBalance: safeNumber(data.availableBalance),
    nextPayoutDate: data.nextPayoutDate || null,
    payoutSchedule: data.payoutSchedule || "monthly",
    accountStatus: {
      chargesEnabled: Boolean(data.accountStatus?.chargesEnabled),
      payoutsEnabled: Boolean(data.accountStatus?.payoutsEnabled),
      detailsSubmitted: Boolean(data.accountStatus?.detailsSubmitted),
      requirementsCount: safeNumber(data.accountStatus?.requirementsCount),
      currentlyDue: Array.isArray(data.accountStatus?.currentlyDue) ? data.accountStatus.currentlyDue : [],
      pastDue: Array.isArray(data.accountStatus?.pastDue) ? data.accountStatus.pastDue : [],
    },
    salesMetrics: {
      totalSales: safeNumber(data.salesMetrics?.totalSales),
      thisMonthSales: safeNumber(data.salesMetrics?.thisMonthSales),
      last30DaysSales: safeNumber(data.salesMetrics?.last30DaysSales),
      averageTransactionValue: safeNumber(data.salesMetrics?.averageTransactionValue),
      conversionRate: safeNumber(data.salesMetrics?.conversionRate),
    },
    recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : [],
    payoutHistory: Array.isArray(data.payoutHistory) ? data.payoutHistory : [],
    monthlyBreakdown: Array.isArray(data.monthlyBreakdown) ? data.monthlyBreakdown : [],
    balanceBreakdown: {
      available: Array.isArray(data.balanceBreakdown?.available) ? data.balanceBreakdown.available : [],
      pending: Array.isArray(data.balanceBreakdown?.pending) ? data.balanceBreakdown.pending : [],
      reserved: Array.isArray(data.balanceBreakdown?.reserved) ? data.balanceBreakdown.reserved : [],
    },
    error: data.error || null,
  }
}

/**
 * Create default earnings data structure
 */
export function createDefaultEarningsData(): any {
  return {
    totalEarnings: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    last30DaysEarnings: 0,
    pendingPayout: 0,
    availableBalance: 0,
    nextPayoutDate: null,
    payoutSchedule: "monthly",
    accountStatus: {
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirementsCount: 0,
      currentlyDue: [],
      pastDue: [],
    },
    salesMetrics: {
      totalSales: 0,
      thisMonthSales: 0,
      last30DaysSales: 0,
      averageTransactionValue: 0,
      conversionRate: 0,
    },
    recentTransactions: [],
    payoutHistory: [],
    monthlyBreakdown: [],
    balanceBreakdown: {
      available: [],
      pending: [],
      reserved: [],
    },
    error: null,
  }
}
