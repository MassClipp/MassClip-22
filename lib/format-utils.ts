/**
 * Comprehensive formatting utilities with bulletproof error handling
 */

// Ultra-safe number conversion with extensive logging
export function safeNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback
  }

  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) {
      return fallback
    }
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (isNaN(parsed) || !isFinite(parsed)) {
      return fallback
    }
    return parsed
  }

  return fallback
}

// Safe currency formatting
export function formatCurrency(amount: number, options: { decimals?: number } = {}): string {
  const safeAmount = safeNumber(amount, 0)
  const decimals = options.decimals ?? 2

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(safeAmount)
  } catch (error) {
    // Fallback formatting
    return `$${safeAmount.toFixed(decimals)}`
  }
}

// Safe number formatting
export function formatNumber(value: number): string {
  const safeValue = safeNumber(value, 0)

  try {
    return new Intl.NumberFormat("en-US").format(safeValue)
  } catch (error) {
    return safeValue.toString()
  }
}

// Safe integer formatting
export function formatInteger(value: number): string {
  const safeValue = safeNumber(value, 0)
  return Math.round(safeValue).toString()
}

// Safe percentage formatting
export function formatPercentage(value: number): string {
  const safeValue = safeNumber(value, 0)

  try {
    return `${safeValue.toFixed(1)}%`
  } catch (error) {
    return "0.0%"
  }
}

// Safe duration formatting (missing export)
export function formatDuration(seconds: any): string {
  const safeSeconds = safeNumber(seconds, 0)

  try {
    const hours = Math.floor(safeSeconds / 3600)
    const minutes = Math.floor((safeSeconds % 3600) / 60)
    const remainingSeconds = Math.floor(safeSeconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    }
  } catch (error) {
    return "0:00"
  }
}

// Safe date formatting
export function formatDate(date: any): string {
  try {
    if (!date) {
      return "N/A"
    }

    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) {
      return "N/A"
    }

    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch (error) {
    return "N/A"
  }
}

// Validate and clean earnings data structure
export function validateEarningsData(data: any): any {
  if (!data || typeof data !== "object") {
    return createDefaultEarningsData()
  }

  return {
    totalEarnings: safeNumber(data.totalEarnings, 0),
    thisMonthEarnings: safeNumber(data.thisMonthEarnings, 0),
    lastMonthEarnings: safeNumber(data.lastMonthEarnings, 0),
    last30DaysEarnings: safeNumber(data.last30DaysEarnings, 0),
    pendingPayout: safeNumber(data.pendingPayout, 0),
    availableBalance: safeNumber(data.availableBalance, 0),
    salesMetrics: {
      totalSales: safeNumber(data.salesMetrics?.totalSales, 0),
      thisMonthSales: safeNumber(data.salesMetrics?.thisMonthSales, 0),
      last30DaysSales: safeNumber(data.salesMetrics?.last30DaysSales, 0),
      averageTransactionValue: safeNumber(data.salesMetrics?.averageTransactionValue, 0),
    },
    accountStatus: {
      chargesEnabled: Boolean(data.accountStatus?.chargesEnabled),
      payoutsEnabled: Boolean(data.accountStatus?.payoutsEnabled),
      detailsSubmitted: Boolean(data.accountStatus?.detailsSubmitted),
      requirementsCount: safeNumber(data.accountStatus?.requirementsCount, 0),
    },
    recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : [],
    payoutHistory: Array.isArray(data.payoutHistory) ? data.payoutHistory : [],
    monthlyBreakdown: Array.isArray(data.monthlyBreakdown) ? data.monthlyBreakdown : [],
  }
}

// Create safe default earnings data structure
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
    },
    accountStatus: {
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirementsCount: 0,
    },
    recentTransactions: [],
    payoutHistory: [],
    monthlyBreakdown: [],
  }
}
