/**
 * Utility functions for formatting data
 */

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  if (typeof amount !== "number" || isNaN(amount)) {
    return "$0.00"
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a number with proper locale formatting
 */
export function formatNumber(num: number): string {
  if (typeof num !== "number" || isNaN(num)) {
    return "0"
  }

  return new Intl.NumberFormat("en-US").format(num)
}

/**
 * Format an integer (whole number)
 */
export function formatInteger(value: number): string {
  if (typeof value !== "number" || isNaN(value)) {
    return "0"
  }

  return new Intl.NumberFormat("en-US").format(Math.floor(value))
}

/**
 * Format a percentage
 */
export function formatPercentage(value: number): string {
  if (typeof value !== "number" || isNaN(value)) {
    return "0%"
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds < 0) {
    return "0:00"
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

/**
 * Safely convert any value to a number
 */
export function safeNumber(value: any): number {
  if (typeof value === "number" && !isNaN(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }

  return 0
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string | number): string {
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) {
      return "Invalid Date"
    }

    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "Invalid Date"
  }
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string | number): string {
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) {
      return "Invalid Date"
    }

    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "Invalid Date"
  }
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }

  return ((current - previous) / previous) * 100
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Create safe default earnings data structure
 */
export function createDefaultEarningsData(): any {
  return {
    totalEarnings: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    last30DaysEarnings: 0,
    pendingPayout: 0,
    availableBalance: 0,
    salesMetrics: {
      totalSales: 0,
      thisMonthSales: 0,
      last30DaysSales: 0,
      averageTransactionValue: 0,
      conversionRate: 0,
    },
    accountStatus: {
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirementsCount: 0,
      currentlyDue: [],
      pastDue: [],
    },
    recentTransactions: [],
    payoutHistory: [],
    monthlyBreakdown: [],
    balanceBreakdown: {
      available: [],
      pending: [],
      reserved: [],
    },
    nextPayoutDate: null,
    payoutSchedule: "monthly",
    error: null,
  }
}

/**
 * Validate and clean earnings data structure
 */
export function validateEarningsData(data: any): any {
  if (!data || typeof data !== "object") {
    return createDefaultEarningsData()
  }

  const safeArray = (val: any): any[] => {
    if (Array.isArray(val)) return val
    return []
  }

  const safeObject = (val: any, defaults: any): any => {
    if (val && typeof val === "object") return { ...defaults, ...val }
    return defaults
  }

  return {
    totalEarnings: safeNumber(data.totalEarnings),
    thisMonthEarnings: safeNumber(data.thisMonthEarnings),
    lastMonthEarnings: safeNumber(data.lastMonthEarnings),
    last30DaysEarnings: safeNumber(data.last30DaysEarnings),
    pendingPayout: safeNumber(data.pendingPayout),
    availableBalance: safeNumber(data.availableBalance),
    salesMetrics: safeObject(data.salesMetrics, {
      totalSales: 0,
      thisMonthSales: 0,
      last30DaysSales: 0,
      averageTransactionValue: 0,
      conversionRate: 0,
    }),
    accountStatus: safeObject(data.accountStatus, {
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirementsCount: 0,
      currentlyDue: [],
      pastDue: [],
    }),
    recentTransactions: safeArray(data.recentTransactions),
    payoutHistory: safeArray(data.payoutHistory),
    monthlyBreakdown: safeArray(data.monthlyBreakdown),
    balanceBreakdown: safeObject(data.balanceBreakdown, {
      available: [],
      pending: [],
      reserved: [],
    }),
    nextPayoutDate: data.nextPayoutDate || null,
    payoutSchedule: data.payoutSchedule || "monthly",
    error: data.error || null,
  }
}
