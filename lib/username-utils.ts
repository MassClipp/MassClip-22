/**
 * Utility functions for username generation and validation
 */

/**
 * Generates a unique username based on display name or email
 * @param displayName User's display name
 * @param email User's email
 * @param uid User's ID for fallback
 * @returns A generated username
 */
export function generateUsername(displayName: string | null, email: string | null, uid: string): string {
  // Try to use display name first
  if (displayName) {
    // Convert display name to lowercase, replace spaces with underscores, and remove special characters
    const baseUsername = displayName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .substring(0, 20) // Limit length

    // Add a random number to make it more unique
    return `${baseUsername}${Math.floor(Math.random() * 1000)}`
  }

  // If no display name, try to use email
  if (email) {
    // Get the part before @ and clean it
    const emailUsername = email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .substring(0, 20) // Limit length

    return `${emailUsername}${Math.floor(Math.random() * 1000)}`
  }

  // Last resort: use user ID with prefix
  return `user_${uid.substring(0, 8)}`
}

/**
 * Validates a username against basic rules
 * @param username Username to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateUsername(username: string): { isValid: boolean; message?: string } {
  // Check length
  if (username.length < 3) {
    return { isValid: false, message: "Username must be at least 3 characters" }
  }

  if (username.length > 30) {
    return { isValid: false, message: "Username must be less than 30 characters" }
  }

  // Check characters (only allow letters, numbers, and underscores)
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { isValid: false, message: "Username can only contain lowercase letters, numbers, and underscores" }
  }

  return { isValid: true }
}
