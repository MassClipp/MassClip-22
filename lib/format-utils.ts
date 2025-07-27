/**
 * Ultra-safe number formatting utilities
 * Handles all edge cases to prevent toFixed() errors
 */

// Type guard to check if a value is a valid number
export const isValidNumber = (value: any): value is number => {
  return typeof value === "number" && isFinite(value) && !isNaN(value)
}

// Ultra-safe number conversion with extensive validation
export const safeNumber = (value: any, fallback = 0): number => {
  // Handle null, undefined, empty string, boolean false
  if (value === null || value === undefined || value === "" || value === false) {
    return fallback
  }

  // If it's already a number, validate it thoroughly
  if (typeof value === "number") {
    // Check for NaN, Infinity, -Infinity
    if (!isFinite(value) || isNaN(value)) {
      console.warn(`safeNumber: Invalid number detected:`, value, `Using fallback: ${fallback}`)
      return fallback
    }
    return value
  }

  // Handle string conversion
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed === "" || trimmed === "null" || trimmed === "undefined") {
      return fallback
    }

    // Try to parse the string
    const parsed = Number(trimmed)
    if (!isFinite(parsed) || isNaN(parsed)) {
      console.warn(`safeNumber: String conversion failed:`, value, `Using fallback: ${fallback}`)
      return fallback
    }
    return parsed
  }

  // Handle boolean conversion
  if (typeof value === "boolean") {
    return value ? 1 : 0
  }

  // Try generic Number conversion as last resort
  try {
    const converted = Number(value)
    if (!isFinite(converted) || isNaN(converted)) {
      console.warn(`safeNumber: Generic conversion failed:`, value, `Using fallback: ${fallback}`)
      return fallback
    }
    return converted
  } catch (error) {
    console.error(`safeNumber: Conversion error for value:`, value, error)
    return fallback
  }
}

// Ultra-safe currency formatting
export const formatCurrency = (
  value: any,
  options: {
    fallback?: string
    decimals?: number
    prefix?: string
    suffix?: string
  } = {},
): string => {
  const { fallback = "0.00", decimals = 2, prefix = "", suffix = "" } = options

  try {
    // Convert to safe number first
    const num = safeNumber(value, 0)

    // Double-check that we have a valid number
    if (!isValidNumber(num)) {
      console.warn(`formatCurrency: Invalid number after conversion:`, value, `→`, num, `Using fallback: ${fallback}`)
      return fallback
    }

    // Ensure decimals is a valid number
    const safeDecimals = safeNumber(decimals, 2)
    if (safeDecimals < 0 || safeDecimals > 20) {
      console.warn(`formatCurrency: Invalid decimals:`, decimals, `Using 2`)
      return `${prefix}${num.toFixed(2)}${suffix}`
    }

    return `${prefix}${num.toFixed(safeDecimals)}${suffix}`
  } catch (error) {
    console.error(`formatCurrency: Formatting error for value:`, value, error)
    return fallback
  }
}

// Safe percentage formatting
export const formatPercentage = (
  value: any,
  options: {
    fallback?: string
    decimals?: number
    suffix?: string
  } = {},
): string => {
  const { fallback = "0.0", decimals = 1, suffix = "%" } = options

  try {
    const num = safeNumber(value, 0)

    if (!isValidNumber(num)) {
      console.warn(`formatPercentage: Invalid number:`, value, `Using fallback: ${fallback}`)
      return fallback
    }

    const safeDecimals = safeNumber(decimals, 1)
    return `${num.toFixed(safeDecimals)}${suffix}`
  } catch (error) {
    console.error(`formatPercentage: Formatting error for value:`, value, error)
    return fallback
  }
}

// Safe integer formatting
export const formatInteger = (value: any, fallback = "0"): string => {
  try {
    const num = safeNumber(value, 0)

    if (!isValidNumber(num)) {
      console.warn(`formatInteger: Invalid number:`, value, `Using fallback: ${fallback}`)
      return fallback
    }

    return Math.round(num).toString()
  } catch (error) {
    console.error(`formatInteger: Formatting error for value:`, value, error)
    return fallback
  }
}

// Safe number with commas
export const formatNumberWithCommas = (
  value: any,
  options: {
    fallback?: string
    decimals?: number
  } = {},
): string => {
  const { fallback = "0", decimals = 0 } = options

  try {
    const num = safeNumber(value, 0)

    if (!isValidNumber(num)) {
      console.warn(`formatNumberWithCommas: Invalid number:`, value, `Using fallback: ${fallback}`)
      return fallback
    }

    const safeDecimals = safeNumber(decimals, 0)
    return num.toFixed(safeDecimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  } catch (error) {
    console.error(`formatNumberWithCommas: Formatting error for value:`, value, error)
    return fallback
  }
}

// Safe object property access
export const safeGet = (obj: any, path: string, fallback: any = undefined) => {
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

// Validate and clean earnings data structure
export const validateEarningsData = (data: any) => {
  if (!data || typeof data !== "object") {
    console.warn("validateEarningsData: Invalid data structure, using defaults")
    return createDefaultEarningsData()
  }

  return {
    totalEarnings: safeNumber(safeGet(data, "totalEarnings", 0)),
    thisMonthEarnings: safeNumber(safeGet(data, "thisMonthEarnings", 0)),
    lastMonthEarnings: safeNumber(safeGet(data, "lastMonthEarnings", 0)),
    last30DaysEarnings: safeNumber(safeGet(data, "last30DaysEarnings", 0)),
    pendingPayout: safeNumber(safeGet(data, "pendingPayout", 0)),
    availableBalance: safeNumber(safeGet(data, "availableBalance", 0)),
    salesMetrics: {
      totalSales: safeNumber(safeGet(data, "salesMetrics.totalSales", 0)),
      thisMonthSales: safeNumber(safeGet(data, "salesMetrics.thisMonthSales", 0)),
      last30DaysSales: safeNumber(safeGet(data, "salesMetrics.last30DaysSales", 0)),
      averageTransactionValue: safeNumber(safeGet(data, "salesMetrics.averageTransactionValue", 0)),
    },
    accountStatus: {
      chargesEnabled: Boolean(safeGet(data, "accountStatus.chargesEnabled", false)),
      payoutsEnabled: Boolean(safeGet(data, "accountStatus.payoutsEnabled", false)),
      detailsSubmitted: Boolean(safeGet(data, "accountStatus.detailsSubmitted", false)),
      requirementsCount: safeNumber(safeGet(data, "accountStatus.requirementsCount", 0)),
    },
    recentTransactions: Array.isArray(safeGet(data, "recentTransactions")) ? data.recentTransactions : [],
    payoutHistory: Array.isArray(safeGet(data, "payoutHistory")) ? data.payoutHistory : [],
    monthlyBreakdown: Array.isArray(safeGet(data, "monthlyBreakdown")) ? data.monthlyBreakdown : [],
  }
}

// Create default earnings data structure
export const createDefaultEarningsData = () => ({
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
})
