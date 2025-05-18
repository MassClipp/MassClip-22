/**
 * Validates a username according to the specified rules
 * - Must be lowercase
 * - Must contain only letters, numbers, underscores
 * - Must be between 3-20 characters
 */
export function validateUsername(username: string): { isValid: boolean; message?: string } {
  // Check if username is empty
  if (!username) {
    return { isValid: false, message: "Username is required" }
  }

  // Check if username is lowercase
  if (username !== username.toLowerCase()) {
    return { isValid: false, message: "Username must be lowercase" }
  }

  // Check if username contains only letters, numbers, underscores
  const validCharsRegex = /^[a-z0-9_]+$/
  if (!validCharsRegex.test(username)) {
    return { isValid: false, message: "Username can only contain letters, numbers, and underscores" }
  }

  // Check if username is between 3-20 characters
  if (username.length < 3 || username.length > 20) {
    return { isValid: false, message: "Username must be between 3-20 characters" }
  }

  return { isValid: true }
}
