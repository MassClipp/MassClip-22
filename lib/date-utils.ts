/**
 * Safely converts a Firestore timestamp or any date-like value to a JavaScript Date
 */
export function safelyConvertToDate(dateValue: any): Date {
  if (!dateValue) return new Date()

  // If it's already a Date object
  if (dateValue instanceof Date) {
    // Check if it's a valid date
    if (isNaN(dateValue.getTime())) {
      console.warn("Invalid Date object provided, returning current date")
      return new Date()
    }
    return dateValue
  }

  // If it's a Firestore timestamp with toDate() method
  if (dateValue && typeof dateValue.toDate === "function") {
    try {
      const convertedDate = dateValue.toDate()
      if (isNaN(convertedDate.getTime())) {
        console.warn("Firestore timestamp converted to invalid date, returning current date")
        return new Date()
      }
      return convertedDate
    } catch (e) {
      console.error("Error converting Firestore timestamp:", e)
      return new Date()
    }
  }

  // If it's a timestamp number
  if (typeof dateValue === "number") {
    // Handle both seconds and milliseconds timestamps
    const timestamp = dateValue < 10000000000 ? dateValue * 1000 : dateValue
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) {
      console.warn("Invalid timestamp number provided:", dateValue)
      return new Date()
    }
    return date
  }

  // If it's an ISO string or other string format
  if (typeof dateValue === "string") {
    if (!dateValue.trim()) return new Date()

    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string provided:", dateValue)
        return new Date()
      }
      return date
    } catch (e) {
      console.error("Error parsing date string:", dateValue, e)
      return new Date()
    }
  }

  // If it's an object with seconds/nanoseconds (Firestore timestamp format)
  if (dateValue && typeof dateValue === "object" && "seconds" in dateValue) {
    try {
      const timestamp = dateValue.seconds * 1000 + (dateValue.nanoseconds || 0) / 1000000
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) {
        console.warn("Invalid Firestore timestamp object:", dateValue)
        return new Date()
      }
      return date
    } catch (e) {
      console.error("Error converting Firestore timestamp object:", dateValue, e)
      return new Date()
    }
  }

  // Default fallback
  console.warn("Unknown date format provided:", dateValue, "returning current date")
  return new Date()
}

/**
 * Safely formats a date value to a localized string
 */
export function safelyFormatDate(dateValue: any, options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = safelyConvertToDate(dateValue)
    return date.toLocaleDateString(undefined, options)
  } catch (e) {
    console.error("Error formatting date:", dateValue, e)
    return "Invalid date"
  }
}

/**
 * Safely formats a date value to a localized time string
 */
export function safelyFormatTime(dateValue: any, options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = safelyConvertToDate(dateValue)
    return date.toLocaleTimeString(undefined, options)
  } catch (e) {
    console.error("Error formatting time:", dateValue, e)
    return "Invalid time"
  }
}

/**
 * Safely formats a date value to a localized date and time string
 */
export function safelyFormatDateTime(dateValue: any, options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = safelyConvertToDate(dateValue)
    return date.toLocaleString(undefined, options)
  } catch (e) {
    console.error("Error formatting date and time:", dateValue, e)
    return "Invalid date/time"
  }
}

/**
 * Safely formats a relative time (e.g., "2 hours ago")
 */
export function safelyFormatRelativeTime(dateValue: any): string {
  try {
    const date = safelyConvertToDate(dateValue)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`
    return `${Math.floor(diffInSeconds / 31536000)}y ago`
  } catch (e) {
    console.error("Error formatting relative time:", dateValue, e)
    return "unknown"
  }
}

/**
 * Checks if a date value is valid
 */
export function isValidDate(dateValue: any): boolean {
  try {
    const date = safelyConvertToDate(dateValue)
    return !isNaN(date.getTime())
  } catch (e) {
    return false
  }
}

/**
 * Safe date comparison
 */
export function compareDates(date1: any, date2: any): number {
  try {
    const d1 = safelyConvertToDate(date1)
    const d2 = safelyConvertToDate(date2)
    return d1.getTime() - d2.getTime()
  } catch (e) {
    console.error("Error comparing dates:", date1, date2, e)
    return 0
  }
}
