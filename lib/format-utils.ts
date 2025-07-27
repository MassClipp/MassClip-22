/**
 * Ultra-safe number formatting utilities with comprehensive error handling
 */

// Safe number conversion with extensive logging
export function safeNumber(value: any, fallback = 0): number {
  console.log("safeNumber input:", { value, type: typeof value, fallback })

  if (value === null || value === undefined) {
    console.log("safeNumber: null/undefined, returning fallback:", fallback)
    return fallback
  }

  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) {
      console.log("safeNumber: invalid number, returning fallback:", fallback)
      return fallback
    }
    console.log("safeNumber: valid number:", value)
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (isNaN(parsed) || !isFinite(parsed)) {
      console.log("safeNumber: invalid string number, returning fallback:", fallback)
      return fallback
    }
    console.log("safeNumber: parsed string to number:", parsed)
    return parsed
  }

  console.log("safeNumber: unknown type, returning fallback:", fallback)
  return fallback
}

// Ultra-safe currency formatting
export function formatCurrency(amount: any): string {
  console.log("formatCurrency input:", { amount, type: typeof amount })

  const safeAmount = safeNumber(amount, 0)
  console.log("formatCurrency safeAmount:", safeAmount)

  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount)
    console.log("formatCurrency result:", formatted)
    return formatted
  } catch (error) {
    console.error("formatCurrency error:", error)
    return `$${safeAmount.toFixed(2)}`
  }
}

// Ultra-safe percentage formatting
export function formatPercentage(value: any): string {
  console.log("formatPercentage input:", { value, type: typeof value })

  const safeValue = safeNumber(value, 0)
  console.log("formatPercentage safeValue:", safeValue)

  try {
    const formatted = `${safeValue.toFixed(1)}%`
    console.log("formatPercentage result:", formatted)
    return formatted
  } catch (error) {
    console.error("formatPercentage error:", error)
    return "0.0%"
  }
}

// Ultra-safe number formatting with decimals
export function formatNumber(value: any, decimals = 0): string {
  console.log("formatNumber input:", { value, type: typeof value, decimals })

  const safeValue = safeNumber(value, 0)
  console.log("formatNumber safeValue:", safeValue)

  try {
    const formatted = safeValue.toFixed(decimals)
    console.log("formatNumber result:", formatted)
    return formatted
  } catch (error) {
    console.error("formatNumber error:", error)
    return "0"
  }
}

// Safe integer formatting (missing export)
export function formatInteger(value: any, fallback = "0"): string {
  console.log("formatInteger input:", { value, type: typeof value, fallback })

  const safeValue = safeNumber(value, 0)
  console.log("formatInteger safeValue:", safeValue)

  try {
    const formatted = Math.round(safeValue).toString()
    console.log("formatInteger result:", formatted)
    return formatted
  } catch (error) {
    console.error("formatInteger error:", error)
    return fallback
  }
}

// Safe duration formatting
export function formatDuration(seconds: any): string {
  console.log("formatDuration input:", { seconds, type: typeof seconds })

  const safeSeconds = safeNumber(seconds, 0)
  console.log("formatDuration safeSeconds:", safeSeconds)

  try {
    const hours = Math.floor(safeSeconds / 3600)
    const minutes = Math.floor((safeSeconds % 3600) / 60)
    const remainingSeconds = Math.floor(safeSeconds % 60)

    if (hours > 0) {
      const formatted = `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
      console.log("formatDuration result (with hours):", formatted)
      return formatted
    } else {
      const formatted = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
      console.log("formatDuration result (minutes only):", formatted)
      return formatted
    }
  } catch (error) {
    console.error("formatDuration error:", error)
    return "0:00"
  }
}

// Safe date formatting
export function formatDate(date: any): string {
  console.log("formatDate input:", { date, type: typeof date })

  try {
    if (!date) {
      console.log("formatDate: no date provided, returning default")
      return "N/A"
    }

    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) {
      console.log("formatDate: invalid date, returning default")
      return "N/A"
    }

    const formatted = dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    console.log("formatDate result:", formatted)
    return formatted
  } catch (error) {
    console.error("formatDate error:", error)
    return "N/A"
  }
}

// Create default earnings data structure (missing export)
export function createDefaultEarningsData() {
  console.log("Creating default earnings data structure")

  const defaultData = {
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

  console.log("Default earnings data created:", defaultData)
  return defaultData
}

// Validate earnings data structure
export function validateEarningsData(data: any): any {
  console.log("validateEarningsData input:", data)

  if (!data || typeof data !== "object") {
    console.warn("validateEarningsData: Invalid data structure, using defaults")
    return createDefaultEarningsData()
  }

  const validated = {
    totalEarnings: safeNumber(data?.totalEarnings, 0),
    thisMonthEarnings: safeNumber(data?.thisMonthEarnings, 0),
    lastMonthEarnings: safeNumber(data?.lastMonthEarnings, 0),
    last30DaysEarnings: safeNumber(data?.last30DaysEarnings, 0),
    pendingPayout: safeNumber(data?.pendingPayout, 0),
    availableBalance: safeNumber(data?.availableBalance, 0),
    salesMetrics: {
      totalSales: safeNumber(data?.salesMetrics?.totalSales, 0),
      thisMonthSales: safeNumber(data?.salesMetrics?.thisMonthSales, 0),
      last30DaysSales: safeNumber(data?.salesMetrics?.last30DaysSales, 0),
      averageTransactionValue: safeNumber(data?.salesMetrics?.averageTransactionValue, 0),
    },
    accountStatus: {
      chargesEnabled: Boolean(data?.accountStatus?.chargesEnabled),
      payoutsEnabled: Boolean(data?.accountStatus?.payoutsEnabled),
      detailsSubmitted: Boolean(data?.accountStatus?.detailsSubmitted),
      requirementsCount: safeNumber(data?.accountStatus?.requirementsCount, 0),
    },
    recentTransactions: Array.isArray(data?.recentTransactions) ? data.recentTransactions : [],
    payoutHistory: Array.isArray(data?.payoutHistory) ? data.payoutHistory : [],
    monthlyBreakdown: Array.isArray(data?.monthlyBreakdown) ? data.monthlyBreakdown : [],
  }

  console.log("validateEarningsData result:", validated)
  return validated
}

// Safe object property access
export function safeGet(obj: any, path: string, fallback: any = undefined) {
  try {
    if (!obj || typeof obj !== "object") {
      return fallback
    }

    const keys = path.split(".")
    let current = obj

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== "object") {
        return fallback
      }
      current = current[key]
    }

    return current !== undefined ? current : fallback
  } catch (error) {
    console.warn(`safeGet: Error accessing path "${path}":`, error)
    return fallback
  }
}

// Safe number with commas formatting
export function formatNumberWithCommas(value: any, decimals = 0): string {
  console.log("formatNumberWithCommas input:", { value, type: typeof value, decimals })

  const safeValue = safeNumber(value, 0)
  console.log("formatNumberWithCommas safeValue:", safeValue)

  try {
    const formatted = safeValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    console.log("formatNumberWithCommas result:", formatted)
    return formatted
  } catch (error) {
    console.error("formatNumberWithCommas error:", error)
    return "0"
  }
}

// Type guard to check if a value is a valid number
export function isValidNumber(value: any): value is number {
  return typeof value === "number" && isFinite(value) && !isNaN(value)
}
