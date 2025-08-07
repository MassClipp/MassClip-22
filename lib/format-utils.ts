/**
 * Utility functions for formatting numbers, dates, and other data
 */

export interface StripeEarningsData {
  totalEarnings: number
  thisMonthEarnings: number
  lastMonthEarnings: number
  last30DaysEarnings: number
  pendingPayout: number
  availableBalance: number
  nextPayoutDate: Date | null
  payoutSchedule: string
  salesMetrics: {
    totalSales: number
    thisMonthSales: number
    last30DaysSales: number
    averageTransactionValue: number
    conversionRate: number
  }
  accountStatus: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
    requirementsCount: number
    currentlyDue: string[]
    pastDue: string[]
  }
  recentTransactions: any[]
  payoutHistory: any[]
  monthlyBreakdown: any[]
  balanceBreakdown: {
    available: { amount: number; currency: string }[]
    pending: { amount: number; currency: string }[]
    reserved: { amount: number; currency: string }[]
  }
  error?: string | null
  isDemo?: boolean
  isUnconnected?: boolean
  message?: string
}

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
 * Creates default earnings data with all zeros - for unconnected accounts
 */
export function createDefaultEarningsData(): StripeEarningsData {
  return {
    totalEarnings: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    last30DaysEarnings: 0,
    pendingPayout: 0,
    availableBalance: 0,
    nextPayoutDate: null,
    payoutSchedule: "monthly",
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
    isDemo: false,
    isUnconnected: true,
    message: "Connect your Stripe account to view earnings data",
  }
}

/**
 * Validates and sanitizes earnings data to ensure all numbers are valid
 */
export function validateEarningsData(data: any): StripeEarningsData {
  if (!data || typeof data !== 'object') {
    console.warn("Invalid earnings data received, using defaults")
    return createDefaultEarningsData()
  }

  // Helper function to safely get array
  const safeArray = (value: any): any[] => {
    return Array.isArray(value) ? value : []
  }

  // Helper function to safely get object
  const safeObject = (value: any, defaults: any): any => {
    return value && typeof value === 'object' ? { ...defaults, ...value } : defaults
  }

  const validated: StripeEarningsData = {
    totalEarnings: safeNumber(data.totalEarnings),
    thisMonthEarnings: safeNumber(data.thisMonthEarnings),
    lastMonthEarnings: safeNumber(data.lastMonthEarnings),
    last30DaysEarnings: safeNumber(data.last30DaysEarnings),
    pendingPayout: safeNumber(data.pendingPayout),
    availableBalance: safeNumber(data.availableBalance),
    nextPayoutDate: data.nextPayoutDate ? new Date(data.nextPayoutDate) : null,
    payoutSchedule: typeof data.payoutSchedule === 'string' ? data.payoutSchedule : "monthly",
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
    error: data.error || null,
    isDemo: Boolean(data.isDemo),
    isUnconnected: Boolean(data.isUnconnected),
    message: data.message || null,
  }

  // Ensure salesMetrics numbers are valid
  validated.salesMetrics.totalSales = safeNumber(validated.salesMetrics.totalSales)
  validated.salesMetrics.thisMonthSales = safeNumber(validated.salesMetrics.thisMonthSales)
  validated.salesMetrics.last30DaysSales = safeNumber(validated.salesMetrics.last30DaysSales)
  validated.salesMetrics.averageTransactionValue = safeNumber(validated.salesMetrics.averageTransactionValue)
  validated.salesMetrics.conversionRate = safeNumber(validated.salesMetrics.conversionRate)

  // Ensure accountStatus numbers are valid
  validated.accountStatus.requirementsCount = safeNumber(validated.accountStatus.requirementsCount)
  validated.accountStatus.currentlyDue = safeArray(validated.accountStatus.currentlyDue)
  validated.accountStatus.pastDue = safeArray(validated.accountStatus.pastDue)

  return validated
}
