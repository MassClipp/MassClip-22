export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) return { valid: false, error: "Username is required" }

  // Check length
  if (username.length < 3 || username.length > 20) {
    return { valid: false, error: "Username must be between 3 and 20 characters" }
  }

  // Check format (lowercase letters, numbers, underscores only)
  const usernameRegex = /^[a-z0-9_]+$/
  if (!usernameRegex.test(username)) {
    return { valid: false, error: "Username can only contain lowercase letters, numbers, and underscores" }
  }

  return { valid: true }
}
