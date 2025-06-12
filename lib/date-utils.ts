/**
 * Safely converts a Firestore timestamp or any date-like value to a JavaScript Date
 */
export function safelyConvertToDate(dateValue: any): Date {
  if (!dateValue) return new Date()

  // If it's already a Date object
  if (dateValue instanceof Date) return dateValue

  // If it's a Firestore timestamp with toDate() method
  if (dateValue && typeof dateValue.toDate === "function") {
    try {
      return dateValue.toDate()
    } catch (e) {
      console.error("Error converting Firestore timestamp:", e)
      return new Date()
    }
  }

  // If it's a timestamp number
  if (typeof dateValue === "number") {
    return new Date(dateValue)
  }

  // If it's an ISO string
  if (typeof dateValue === "string") {
    try {
      return new Date(dateValue)
    } catch (e) {
      console.error("Error parsing date string:", e)
      return new Date()
    }
  }

  // Default fallback
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
    console.error("Error formatting date:", e)
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
    console.error("Error formatting time:", e)
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
    console.error("Error formatting date and time:", e)
    return "Invalid date/time"
  }
}
