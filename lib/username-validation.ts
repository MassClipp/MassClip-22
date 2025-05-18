/**
 * Validates a username according to the specified rules
 * @param username The username to validate
 * @returns An object with isValid and message properties
 */
export function validateUsername(username: string): { isValid: boolean; message: string } {
  // Check if username is empty
  if (!username) {
    return { isValid: false, message: "Username is required" }
  }

  // Check length (3-20 characters)
  if (username.length < 3 || username.length > 20) {
    return { isValid: false, message: "Username must be between 3 and 20 characters" }
  }

  // Check if username is lowercase
  if (username !== username.toLowerCase()) {
    return { isValid: false, message: "Username must be lowercase" }
  }

  // Check if username contains only letters, numbers, and underscores
  const validUsernameRegex = /^[a-z0-9_]+$/
  if (!validUsernameRegex.test(username)) {
    return { isValid: false, message: "Username can only contain lowercase letters, numbers, and underscores" }
  }

  return { isValid: true, message: "Username is valid" }
}
